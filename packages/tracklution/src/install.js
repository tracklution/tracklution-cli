// `npx tracklution install` — the deterministic, opt-in installer.
//
// Design constraints (do NOT regress):
//   - ZERO runtime dependencies: Node >=18 builtins only (fetch, node:fs,
//     node:path, node:crypto, node:child_process, node:os). This preserves
//     the package's no-install-hooks / zero-deps security posture.
//   - The default `npx tracklution` (no args) stays a pure stdout printer;
//     this module is only reached via the `install` subcommand.
//   - SECRET HYGIENE: the CLI is the only holder of both JWTs. `mcp_token`
//     goes into the host MCP config file; `laravel_auth_token` is used as a
//     Bearer for the CLI's own REST calls. NEITHER is ever printed to stdout
//     (so neither lands in the agent transcript). Every `_sensitive_*` field
//     the REST endpoints return UNREDACTED is stripped before output — the
//     SINGLE exception is the dashboard login URL, surfaced as `login_url`
//     (the contract's one allowed echo).
//   - Idempotency discipline: ONE persisted key for quick-setup (it replays
//     the same token on reuse); a FRESH key per verify-and-score / login-link
//     (those replay their cached response verbatim, so reuse = stale data).
//
// Output: exactly ONE machine-readable JSON line on stdout. Human-readable
// progress/diagnostics go to stderr.

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { INSTALL_METHODS, URLS } from './payload.js';

const IDEMPOTENCY_FILE = '.tracklution-install.json';

// Marker comments wrapping the auto-injected plain-HTML base loader. Used to
// make injection idempotent (re-running install must not double-inject).
const HTML_MARKER_OPEN = '<!-- tracklution:start (managed by npx tracklution install) -->';
const HTML_MARKER_CLOSE = '<!-- tracklution:end -->';

// ---------------------------------------------------------------------------
// arg parsing (supports --k=v, --k v, and bare --flag)
// ---------------------------------------------------------------------------
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const body = tok.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        out[body.slice(0, eq)] = body.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          out[body] = next;
          i++;
        } else {
          out[body] = true;
        }
      }
    } else {
      out._.push(tok);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// host + framework resolution
// ---------------------------------------------------------------------------
const HOST_ALIASES = {
  claude: 'claude_code',
  'claude-code': 'claude_code',
  claudecode: 'claude_code',
  'claude-desktop': 'claude_code',
};

export function normalizeHost(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const key = raw.toLowerCase().trim().replace(/-/g, '_');
  if (INSTALL_METHODS[key]) return key;
  const aliased = HOST_ALIASES[raw.toLowerCase().trim()] || HOST_ALIASES[key];
  if (aliased && INSTALL_METHODS[aliased]) return aliased;
  return null;
}

export function detectHost(env = {}, cwd = '.') {
  // Claude Code sets these in its shell / agent process. Most reliable signal
  // (fires in the Desktop-embedded agent where `claude` is not on PATH).
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return 'claude_code';
  if (env.CURSOR_TRACE_ID || env.CURSOR_AGENT) return 'cursor';
  try {
    if (existsSync(join(cwd, '.cursor'))) return 'cursor';
    if (existsSync(join(cwd, '.mcp.json'))) return 'claude_code';
  } catch {
    /* ignore fs errors */
  }
  return null;
}

// The Laravel QuickSetupRequest validator only accepts html|nextjs|other
// (and maps `other` -> html). Collapse any detected framework to that set.
export function mapFrameworkForApi(fw) {
  return String(fw || '').toLowerCase() === 'nextjs' ? 'nextjs' : 'html';
}

export function detectFramework(cwd = '.') {
  try {
    for (const f of ['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs']) {
      if (existsSync(join(cwd, f))) return 'nextjs';
    }
    const pkgPath = join(cwd, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      if (deps.next) return 'nextjs';
    }
  } catch {
    /* ignore — fall through to html */
  }
  return 'html';
}

// ---------------------------------------------------------------------------
// idempotency key persistence
// ---------------------------------------------------------------------------
export function loadOrCreateIdempotencyKey(cwd) {
  const path = join(cwd, IDEMPOTENCY_FILE);
  const valid = (k) => typeof k === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(k);
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8'));
      if (valid(parsed.quick_setup_key)) return parsed.quick_setup_key;
    } catch {
      /* malformed — regenerate below */
    }
  }
  const key = randomUUID();
  try {
    writeFileSync(
      path,
      JSON.stringify({ quick_setup_key: key, created_at: new Date().toISOString() }, null, 2) + '\n'
    );
  } catch {
    /* non-fatal: a non-persisted key still works for a single run */
  }
  return key;
}

export function freshKey() {
  return randomUUID();
}

// ---------------------------------------------------------------------------
// HTTP (builtin fetch)
// ---------------------------------------------------------------------------
async function httpRequest(fetchImpl, method, url, { bearer, idempotencyKey, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetchImpl(url, { method, headers, body: payload, redirect: 'manual' });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: res.status >= 200 && res.status < 300, status: res.status, json, text };
}

// ---------------------------------------------------------------------------
// config-file path resolution + writers
// ---------------------------------------------------------------------------
function expandPath(p, cwd, env) {
  let out = p;
  const home = env.HOME || env.USERPROFILE || homedir();
  if (out.startsWith('~/') || out === '~') out = out.replace(/^~/, home);
  out = out.replace('%USERPROFILE%', home).replace('%AppData%', env.AppData || join(home, 'AppData', 'Roaming'));
  // A leading-slash or drive-letter or expanded ~ is absolute; otherwise it's
  // a project-relative path (e.g. `.mcp.json`, `.cursor/mcp.json`).
  if (/^([A-Za-z]:[\\/]|[\\/]|~)/.test(out) || out !== p) return resolve(out);
  return resolve(cwd, out);
}

// Build the MCP server entry by overlaying the quick-setup snippet (url +
// Authorization header) on top of the host's body template. The template is
// what supplies host-specific discriminators the snippet omits — critically
// Claude Code's `.mcp.json` requires `type:"http"`, which the snippet lacks.
export function buildServerEntry(host, snippetEntry) {
  const base = INSTALL_METHODS[host]?.body || {};
  return { ...base, ...(snippetEntry || {}) };
}

function parseMergeKey(mergeKey) {
  const parts = String(mergeKey || 'mcpServers.tracklution').split('.');
  return { parent: parts[0] || 'mcpServers', name: parts[1] || 'tracklution' };
}

// Choose the OS-appropriate config path from a host's `target_paths` list.
// Most hosts list a single portable `~/…` or project-relative path at [0], but
// Cline lists per-OS ABSOLUTE paths with the macOS one FIRST — so a naive [0]
// would write to a bogus `~/Library/Application Support/…` path on Windows
// (this very env) and Linux. We reject paths that clearly belong to another OS
// and fall back to [0] only if nothing matches.
export function pickTargetPath(targetPaths, platform = process.platform) {
  if (!Array.isArray(targetPaths) || targetPaths.length === 0) return null;
  const isWin = platform === 'win32';
  const isMac = platform === 'darwin';
  const foreign = (p) => {
    if (p.includes('%')) return !isWin; // %AppData% / %USERPROFILE% → Windows-only
    if (/Library\/Application Support/.test(p)) return !isMac; // macOS-only
    return false; // ~/, ~/.config, or project-relative → portable
  };
  return targetPaths.find((p) => !foreign(p)) || targetPaths[0];
}

function readJsonFile(path) {
  if (!existsSync(path)) return { obj: {}, existed: false };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return { obj: parsed && typeof parsed === 'object' ? parsed : {}, existed: true };
  } catch {
    // Pre-existing but unparseable. Do NOT clobber blindly — caller decides.
    return { obj: {}, existed: true, unparseable: true };
  }
}

function writeJsonMcpConfig(path, mergeKey, serverEntry) {
  const { parent, name } = parseMergeKey(mergeKey);
  const { obj, existed, unparseable } = readJsonFile(path);
  if (unparseable) {
    const e = new Error(`Refusing to overwrite unparseable JSON at ${path}`);
    e.code = 'CONFIG_UNPARSEABLE';
    throw e;
  }
  if (!obj[parent] || typeof obj[parent] !== 'object') obj[parent] = {};
  obj[parent][name] = serverEntry;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
  return { created: !existed };
}

// Codex uses TOML with a `http_headers` table (not `headers`). Zero-dep, so we
// do a conservative string-level merge rather than pull a TOML parser.
function writeTomlMcpConfig(path, serverEntry) {
  const url = serverEntry.url || URLS.mcp_url;
  const auth = serverEntry.headers && serverEntry.headers.Authorization;
  const lines = [
    '[mcp_servers.tracklution]',
    `url = "${url}"`,
    'enabled = true',
  ];
  if (auth) {
    lines.push('', '[mcp_servers.tracklution.http_headers]', `Authorization = "${auth}"`);
  }
  const block = lines.join('\n') + '\n';
  if (!existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, block);
    return { created: true };
  }
  const current = readFileSync(path, 'utf8');
  if (current.includes('[mcp_servers.tracklution]')) {
    // Already present — don't risk a malformed string rewrite.
    return { created: false, manual_merge: true };
  }
  writeFileSync(path, current.replace(/\s*$/, '') + '\n\n' + block);
  return { created: false };
}

export function writeMcpConfig(host, cwd, env, snippet, { platform = process.platform } = {}) {
  const method = INSTALL_METHODS[host];
  if (!method) {
    const e = new Error(`Unknown host '${host}'`);
    e.code = 'UNKNOWN_HOST';
    throw e;
  }
  const targetPaths = method.target_paths || [];
  const isCodex = host === 'codex' || (!!method.body_toml && !method.body);
  const rawPath = pickTargetPath(targetPaths, platform) || (isCodex ? '~/.codex/config.toml' : '.mcp.json');
  const path = expandPath(rawPath, cwd, env);
  // Is this a project-relative config (gitignore applies) or a home-dir one?
  const projectRelative = !/^([A-Za-z]:[\\/]|[\\/]|~)/.test(rawPath) && !rawPath.includes('%');

  const snippetEntry = (snippet && snippet.tracklution) || null;
  const serverEntry = isCodex
    ? { url: (snippetEntry && snippetEntry.url) || URLS.mcp_url, headers: snippetEntry && snippetEntry.headers }
    : buildServerEntry(host, snippetEntry);

  const res = isCodex
    ? writeTomlMcpConfig(path, serverEntry)
    : writeJsonMcpConfig(path, method.merge_key, serverEntry);

  return {
    config_path: path,
    raw_path: rawPath,
    created: res.created,
    manual_merge: !!res.manual_merge,
    project_relative: projectRelative,
  };
}

// ---------------------------------------------------------------------------
// gitignore handling
// ---------------------------------------------------------------------------
function isGitTracked(cwd, relPath) {
  try {
    const r = spawnSync('git', ['ls-files', '--error-unmatch', relPath], {
      cwd,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

// Ensure `relPath` is gitignored in `cwd`. Returns a warning string when the
// file is already git-TRACKED (we must not blanket-untrack it) or null.
export function ensureGitignored(cwd, relPath, { wasCreated = true } = {}) {
  const normalized = relPath.replace(/\\/g, '/');
  if (!wasCreated && isGitTracked(cwd, normalized)) {
    return `'${normalized}' is git-tracked and now holds a Bearer token — review before committing (consider the tokenless + OAuth variant, or untrack it deliberately).`;
  }
  const gi = join(cwd, '.gitignore');
  let content = '';
  if (existsSync(gi)) {
    try {
      content = readFileSync(gi, 'utf8');
    } catch {
      return null;
    }
  }
  const lines = content.split(/\r?\n/).map((l) => l.trim());
  if (lines.includes(normalized) || lines.includes(`/${normalized}`)) return null;
  try {
    const prefix = content && !content.endsWith('\n') ? '\n' : '';
    writeFileSync(gi, content + prefix + normalized + '\n');
  } catch {
    /* non-fatal */
  }
  return null;
}

// ---------------------------------------------------------------------------
// plain-HTML base-loader injection (the ONLY source edit the CLI does)
// ---------------------------------------------------------------------------
export function injectHtmlLoader(cwd, scriptSnippet, pageViewSnippet) {
  const candidates = ['index.html', 'public/index.html', 'src/index.html', 'index.htm', 'public/index.htm'];
  const code = [scriptSnippet, pageViewSnippet].filter(Boolean).join('\n');
  if (!code) return { injected: false, reason: 'no_snippet' };
  for (const rel of candidates) {
    const path = join(cwd, rel);
    if (!existsSync(path)) continue;
    let html;
    try {
      html = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    if (html.includes(HTML_MARKER_OPEN)) {
      return { injected: false, reason: 'already_present', path: rel };
    }
    const idx = html.search(/<\/head>/i);
    if (idx === -1) continue;
    const block = `${HTML_MARKER_OPEN}\n${code}\n${HTML_MARKER_CLOSE}\n`;
    const next = html.slice(0, idx) + block + html.slice(idx);
    try {
      writeFileSync(path, next);
    } catch {
      return { injected: false, reason: 'write_failed', path: rel };
    }
    return { injected: true, path: rel };
  }
  return { injected: false, reason: 'no_html_target' };
}

// ---------------------------------------------------------------------------
// redaction
// ---------------------------------------------------------------------------
export function stripSensitive(value) {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('_sensitive_')) continue;
      out[k] = stripSensitive(v);
    }
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// orchestration
// ---------------------------------------------------------------------------
export async function runInstall({
  argv = [],
  env = process.env,
  cwd = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
  fetchImpl = globalThis.fetch,
} = {}) {
  const emit = (obj) => stdout.write(JSON.stringify(obj) + '\n');
  const log = (s) => stderr.write(`tracklution install: ${s}\n`);

  const args = parseArgs(argv);
  const projectDir = args.cwd ? resolve(String(args.cwd)) : cwd;

  if (typeof fetchImpl !== 'function') {
    emit({ status: 'error', stage: 'preflight', message: 'global fetch is unavailable; Node >=18 is required.' });
    return 1;
  }

  const host = normalizeHost(args.host) || detectHost(env, projectDir);
  if (!host) {
    emit({
      status: 'need_input',
      missing: ['host'],
      message: 'Could not determine the agent host. Pass --host=claude-code|cursor|codex|windsurf|cline.',
    });
    return 2;
  }

  // Guard: user-action hosts (Lovable / Replit / Bolt) cannot accept a
  // file-written or CLI-installed MCP config — the user must add the server
  // through the host's own UI. The deterministic installer can't help here, so
  // refuse BEFORE provisioning (otherwise we'd mint a token with nowhere to
  // live and send a welcome email for an install that can't complete here).
  const hostMethod = INSTALL_METHODS[host];
  if (hostMethod && hostMethod.type === 'user-action') {
    emit({
      status: 'unsupported_host',
      host,
      message: `'${host}' is a user-action host: add the Tracklution MCP via its UI (URL ${URLS.mcp_url}), not a config file. Run the standard MCP/OAuth onboarding instead of 'install'.`,
      instruction: hostMethod.instruction || null,
    });
    return 2;
  }

  const email = typeof args.email === 'string' ? args.email.trim() : '';
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const missing = [];
  if (!email) missing.push('email');
  if (!url) missing.push('url');
  if (missing.length) {
    emit({
      status: 'need_input',
      host,
      missing,
      message: 'Provide --email and --url (the production website URL).',
    });
    return 2;
  }

  const framework = mapFrameworkForApi(
    typeof args.framework === 'string' ? args.framework : detectFramework(projectDir)
  );
  const agentClient = INSTALL_METHODS[host]?.agent_client_value || host.replace(/_/g, '-');

  const quickSetupUrl = env.TRACKLUTION_QUICK_SETUP_URL || (typeof args['quick-setup-url'] === 'string' ? args['quick-setup-url'] : URLS.quick_setup_url);
  const apiBase = (env.TRACKLUTION_API_BASE || (typeof args['api-base'] === 'string' ? args['api-base'] : URLS.api_base_url)).replace(/\/+$/, '');

  const warnings = [];
  const idemKey = loadOrCreateIdempotencyKey(projectDir);
  ensureGitignored(projectDir, IDEMPOTENCY_FILE, { wasCreated: true });

  // 1) provision -----------------------------------------------------------
  log(`provisioning ${email} / ${url} (host=${host}, framework=${framework})`);
  let qs;
  try {
    qs = await httpRequest(fetchImpl, 'POST', quickSetupUrl, {
      body: { idempotency_key: idemKey, email, website_url: url, framework, agent_client: agentClient },
    });
  } catch (e) {
    emit({ status: 'error', stage: 'quick_setup', message: `network error: ${e.message}` });
    return 1;
  }

  const nextActionTool = qs.json && qs.json.next_action && qs.json.next_action.tool;
  const firstErr = qs.json && Array.isArray(qs.json.errors) ? qs.json.errors[0] : null;
  if (qs.status === 409 && (nextActionTool === 'oauth_fallback' || (firstErr && firstErr.code === 'duplicate_account'))) {
    emit({
      status: 'duplicate_account',
      host,
      next: 'oauth_fallback',
      recovery_url: (firstErr && firstErr.details && firstErr.details.recovery_url) || null,
      message: 'An account already exists for this email. Switch to the OAuth/Connect path (write the tokenless MCP entry).',
    });
    return 0;
  }
  if (!qs.ok || !qs.json || !qs.json.data) {
    emit({
      status: 'error',
      stage: 'quick_setup',
      http_status: qs.status,
      code: firstErr && firstErr.code,
      message: (firstErr && firstErr.message) || `quick-setup failed (HTTP ${qs.status}).`,
    });
    return 1;
  }

  const data = qs.json.data;
  const mcpToken = data.mcp_token;
  const laravelToken = data.laravel_auth_token;
  const containerId = data.container && data.container.id;
  const mcpEndpoint = data.mcp_endpoint || URLS.mcp_url;

  // 2) write host MCP config ----------------------------------------------
  let cfg;
  try {
    cfg = writeMcpConfig(host, projectDir, env, data.mcp_config_snippet);
  } catch (e) {
    emit({
      status: 'error',
      stage: 'write_config',
      container_id: containerId,
      message: `provisioned, but failed to write host config: ${e.message}`,
    });
    return 1;
  }
  log(`wrote MCP config: ${cfg.config_path}${cfg.manual_merge ? ' (existing tracklution block left intact)' : ''}`);
  if (cfg.project_relative) {
    const w = ensureGitignored(projectDir, cfg.raw_path, { wasCreated: cfg.created });
    if (w) warnings.push(w);
  }

  // 3) REST onboarding (best-effort; install already succeeded above) ------
  let score = null;
  let nextSteps = [];
  let loginUrl = null;
  let restWarning = null;
  let htmlInjected = false;
  let snippets = null;

  if (laravelToken && containerId) {
    try {
      const base = `${apiBase}/onboarding/containers/${encodeURIComponent(containerId)}`;
      const scriptsRes = await httpRequest(fetchImpl, 'GET', `${base}/installation-scripts?framework=${framework}`, {
        bearer: laravelToken,
      });
      if (scriptsRes.ok && scriptsRes.json && scriptsRes.json.data) {
        const sd = scriptsRes.json.data;
        snippets = stripSensitive({
          raw_scripts: sd.raw_scripts || {},
          framework_snippets: sd.framework_snippets || {},
          recommended_events: sd.recommended_events || [],
        });
        if (framework === 'html' && sd.raw_scripts) {
          const inj = injectHtmlLoader(projectDir, sd.raw_scripts.script, sd.raw_scripts.page_view);
          htmlInjected = !!inj.injected;
          if (inj.injected) log(`injected base loader into ${inj.path}`);
        }
      } else {
        restWarning = `installation-scripts returned HTTP ${scriptsRes.status}`;
      }

      // verify-and-score — FRESH idempotency key (replays verbatim on reuse).
      const vs = await httpRequest(fetchImpl, 'POST', `${base}/verify-and-score`, {
        bearer: laravelToken,
        idempotencyKey: freshKey(),
        body: {},
      });
      if (!vs.ok && !restWarning) restWarning = `verify-and-score returned HTTP ${vs.status}`;

      const ns = await httpRequest(fetchImpl, 'GET', `${base}/next-steps?recalculate=true`, {
        bearer: laravelToken,
      });
      if (ns.ok && ns.json && ns.json.data) {
        if (typeof ns.json.data.overall_progress === 'number') score = ns.json.data.overall_progress;
        nextSteps = (ns.json.data.next_steps || [])
          .slice(0, 3)
          .map((s) => ({ title: s.title || s.message || '', score_impact: s.score_impact ?? null }));
      }

      // login-link — FRESH idempotency key; dashboard target is view-level.
      const ll = await httpRequest(fetchImpl, 'POST', `${base}/login-link`, {
        bearer: laravelToken,
        idempotencyKey: freshKey(),
        body: { target_page: 'dashboard' },
      });
      if (ll.ok && ll.json && ll.json.data && ll.json.data._sensitive_login_url) {
        loginUrl = ll.json.data._sensitive_login_url; // the ONE allowed surfaced URL
      } else if (!ll.ok) {
        // login-link can be disabled server-side (login_link_consume_enabled).
        restWarning = restWarning || `login-link unavailable (HTTP ${ll.status})`;
      }
    } catch (e) {
      restWarning = `REST onboarding incomplete: ${e.message}`;
    }
  } else if (!laravelToken) {
    restWarning = 'no laravel_auth_token in quick-setup response; skipped REST onboarding (config still written).';
  }
  if (restWarning) warnings.push(restWarning);

  // 4) emit ONE machine-readable line (no tokens; sensitive fields stripped)
  const result = stripSensitive({
    status: 'ok',
    host,
    framework,
    container_id: containerId,
    config_path: cfg.config_path,
    mcp_endpoint: mcpEndpoint,
    restart_required: true,
    html_injected: htmlInjected,
    score,
    score_is_baseline: true,
    login_url: loginUrl,
    next_steps: nextSteps,
    snippets,
    warnings,
  });
  // Defence-in-depth: ensure no token leaked into the emitted object.
  const guard = JSON.stringify(result);
  if (mcpToken && guard.includes(mcpToken)) {
    emit({ status: 'error', stage: 'redaction', message: 'internal: refused to emit output containing a token.' });
    return 1;
  }
  if (laravelToken && guard.includes(laravelToken)) {
    emit({ status: 'error', stage: 'redaction', message: 'internal: refused to emit output containing a token.' });
    return 1;
  }
  emit(result);
  return 0;
}
