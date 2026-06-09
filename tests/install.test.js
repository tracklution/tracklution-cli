import { createServer } from 'node:http';
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  runInstall,
  parseArgs,
  normalizeHost,
  mapFrameworkForApi,
  stripSensitive,
  pickTargetPath,
  writeMcpConfig,
} from '../packages/tracklution/src/install.js';

// ---------------------------------------------------------------------------
// A local mock of /install/quick-setup + the /mcp-api/v1/onboarding/* REST
// endpoints. It records every request so the tests can assert the CLI's
// idempotency-key discipline and Bearer usage.
// ---------------------------------------------------------------------------
const MCP_TOKEN = 'mock.mcp.jwt-token-aaaaaaaaaaaaaaaa';
const LARAVEL_TOKEN = 'mock.laravel.jwt-token-bbbbbbbbbbbb';
const CONTAINER_ID = 'cont_mock123';
const WEBHOOK_URL = 'https://track.example.com/webhook?k=SUPER_SECRET_TRACKING_KEY';
const LOGIN_URL = 'https://app.tracklution.com/login/one-time-abc123';

function makeServer({ duplicate = false } = {}) {
  const requests = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let parsed = null;
      try {
        parsed = body ? JSON.parse(body) : null;
      } catch {
        parsed = null;
      }
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: parsed,
      });
      const send = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };

      // quick-setup ----------------------------------------------------
      if (req.url === '/install/quick-setup' && req.method === 'POST') {
        if (duplicate) {
          return send(409, {
            status: 'error',
            errors: [
              {
                code: 'duplicate_account',
                message: 'Account exists for this email.',
                details: { recovery_url: 'https://app.tracklution.com/login' },
              },
            ],
            next_action: { tool: 'oauth_fallback', args: null },
          });
        }
        return send(200, {
          status: 'ok',
          data: {
            mcp_token: MCP_TOKEN,
            mcp_token_expires_at: '2026-09-06T00:00:00+00:00',
            laravel_auth_token: LARAVEL_TOKEN,
            laravel_auth_token_expires_at: '2026-06-08T19:00:00+00:00',
            container: { id: CONTAINER_ID, hash: 'hash_mock', website_domain: 'example.com' },
            mcp_config_snippet: {
              tracklution: {
                url: 'https://mcp.tracklution.com/mcp',
                headers: { Authorization: `Bearer ${MCP_TOKEN}` },
              },
            },
            mcp_endpoint: 'https://mcp.tracklution.com/mcp',
          },
          next_action: { tool: 'merge_mcp_config', args: {} },
        });
      }

      // installation-scripts ------------------------------------------
      if (/\/installation-scripts(\?|$)/.test(req.url) && req.method === 'GET') {
        return send(200, {
          status: 'ok',
          data: {
            container_id: CONTAINER_ID,
            framework: 'html',
            raw_scripts: {
              script: '<script async src="https://track.example.com/t.js"></script>',
              page_view: '<script>tl("PageView")</script>',
            },
            framework_snippets: { layout_tsx: 'export const metadata = {}' },
            recommended_events: ['PageView', 'Purchase'],
            _sensitive_webhook: { url: WEBHOOK_URL, curl_example: `curl ${WEBHOOK_URL}` },
          },
        });
      }

      // verify-and-score ----------------------------------------------
      if (/\/verify-and-score(\?|$)/.test(req.url) && req.method === 'POST') {
        return send(200, {
          status: 'ok',
          data: {
            container_id: CONTAINER_ID,
            verification: { events_verified: false, not_ready_reason: 'no_events_after_install' },
          },
        });
      }

      // next-steps ----------------------------------------------------
      if (/\/next-steps(\?|$)/.test(req.url) && req.method === 'GET') {
        return send(200, {
          status: 'ok',
          data: {
            container_id: CONTAINER_ID,
            overall_progress: 42,
            is_onboarding_complete: false,
            next_steps: [
              { title: 'Deploy your site', score_impact: '+20' },
              { title: 'Fire a Purchase event', score_impact: '+15' },
              { title: 'Activate a connector', score_impact: '+10' },
              { title: 'Extra step', score_impact: '+5' },
            ],
          },
        });
      }

      // login-link ----------------------------------------------------
      if (/\/login-link(\?|$)/.test(req.url) && req.method === 'POST') {
        return send(200, {
          status: 'ok',
          data: {
            _sensitive_login_url: LOGIN_URL,
            expires_at: '2026-06-08T19:15:00+00:00',
            target_page: 'dashboard',
            container_id: CONTAINER_ID,
          },
        });
      }

      return send(404, { status: 'error', errors: [{ code: 'not_found', message: req.url }] });
    });
  });
  return { server, requests };
}

function listen(server) {
  return new Promise((res) => server.listen(0, '127.0.0.1', () => res(server.address().port)));
}

function capture() {
  let buf = '';
  return { write: (s) => ((buf += s), true), get: () => buf };
}

function tmpProject() {
  return mkdtempSync(join(tmpdir(), 'trkl-install-'));
}

async function runIn(dir, argv, port, extraEnv = {}) {
  const out = capture();
  const err = capture();
  const env = {
    TRACKLUTION_QUICK_SETUP_URL: `http://127.0.0.1:${port}/install/quick-setup`,
    TRACKLUTION_API_BASE: `http://127.0.0.1:${port}/mcp-api/v1`,
    ...extraEnv,
  };
  const code = await runInstall({ argv, env, cwd: dir, stdout: out, stderr: err });
  let json = null;
  try {
    json = JSON.parse(out.get().trim());
  } catch {
    /* leave null */
  }
  return { code, json, stdout: out.get(), stderr: err.get() };
}

// ---------------------------------------------------------------------------

describe('install — pure helpers', () => {
  it('parseArgs handles --k=v, --k v, and bare flags', () => {
    const a = parseArgs(['--host=claude-code', '--email', 'a@b.com', '--dry']);
    expect(a.host).toBe('claude-code');
    expect(a.email).toBe('a@b.com');
    expect(a.dry).toBe(true);
  });

  it('normalizeHost maps aliases to canonical keys', () => {
    expect(normalizeHost('claude-code')).toBe('claude_code');
    expect(normalizeHost('claude')).toBe('claude_code');
    expect(normalizeHost('CURSOR')).toBe('cursor');
    expect(normalizeHost('nope')).toBeNull();
  });

  it('mapFrameworkForApi collapses to html|nextjs', () => {
    expect(mapFrameworkForApi('nextjs')).toBe('nextjs');
    expect(mapFrameworkForApi('react')).toBe('html');
    expect(mapFrameworkForApi(undefined)).toBe('html');
  });

  it('stripSensitive removes _sensitive_* keys recursively', () => {
    const o = stripSensitive({ a: 1, _sensitive_x: 'secret', nested: { _sensitive_y: 'z', keep: 2 } });
    expect(o).toEqual({ a: 1, nested: { keep: 2 } });
  });

  it('pickTargetPath selects the OS-appropriate path from a per-OS list (cline)', () => {
    // Mirrors INSTALL_METHODS.cline.target_paths ordering: macOS, Windows,
    // Linux, generic. The naive `[0]` bug always picked the macOS path.
    const paths = [
      '~/Library/Application Support/Code/User/globalStorage/x/settings/cline_mcp_settings.json',
      '%AppData%/Code/User/globalStorage/x/settings/cline_mcp_settings.json',
      '~/.config/Code/User/globalStorage/x/settings/cline_mcp_settings.json',
      '~/.cline/data/settings/cline_mcp_settings.json',
    ];
    expect(pickTargetPath(paths, 'darwin')).toBe(paths[0]);
    expect(pickTargetPath(paths, 'win32')).toBe(paths[1]);
    expect(pickTargetPath(paths, 'linux')).toBe(paths[2]);
    // Portable single-entry lists are returned as-is on every OS.
    expect(pickTargetPath(['.mcp.json'], 'win32')).toBe('.mcp.json');
    expect(pickTargetPath(['~/.codex/config.toml'], 'win32')).toBe('~/.codex/config.toml');
    expect(pickTargetPath(['~/.codex/config.toml'], 'darwin')).toBe('~/.codex/config.toml');
    expect(pickTargetPath([], 'linux')).toBeNull();
  });
});

describe('install — end-to-end against a mock backend', () => {
  let server;
  let requests;
  let port;

  beforeAll(async () => {
    const made = makeServer();
    server = made.server;
    requests = made.requests;
    port = await listen(server);
  });

  afterAll(() => server && server.close());
  beforeEach(() => {
    requests.length = 0;
  });

  it('claude-code: writes .mcp.json with type:http + Bearer, runs REST onboarding, emits a clean line', async () => {
    const dir = tmpProject();
    try {
      const { code, json, stdout } = await runIn(
        dir,
        ['--host=claude-code', '--framework=nextjs', '--email=a@b.com', '--url=https://example.com'],
        port
      );
      expect(code, `stdout: ${stdout}`).toBe(0);
      expect(json.status).toBe('ok');
      expect(json.host).toBe('claude_code');
      expect(json.framework).toBe('nextjs');
      expect(json.container_id).toBe(CONTAINER_ID);
      expect(json.restart_required).toBe(true);
      expect(json.score).toBe(42);
      expect(json.login_url).toBe(LOGIN_URL);
      expect(json.next_steps).toHaveLength(3); // capped at 3
      expect(json.next_steps[0].title).toBe('Deploy your site');

      // .mcp.json shape — type:http (from host body) + Bearer (from snippet).
      const cfg = JSON.parse(readFileSync(join(dir, '.mcp.json'), 'utf8'));
      expect(cfg.mcpServers.tracklution).toEqual({
        type: 'http',
        url: 'https://mcp.tracklution.com/mcp',
        headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('NEVER prints either JWT to stdout; strips _sensitive_webhook but keeps login_url', async () => {
    const dir = tmpProject();
    try {
      const { json, stdout } = await runIn(
        dir,
        ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'],
        port
      );
      expect(stdout).not.toContain(MCP_TOKEN);
      expect(stdout).not.toContain(LARAVEL_TOKEN);
      // _sensitive_webhook (which embeds the tracking key) must be gone.
      expect(stdout).not.toContain('SUPER_SECRET_TRACKING_KEY');
      expect(JSON.stringify(json.snippets)).not.toContain('_sensitive_');
      // The login URL is the ONE allowed surfaced value.
      expect(json.login_url).toBe(LOGIN_URL);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('idempotency discipline: ONE persisted key for quick-setup, FRESH key per verify/login', async () => {
    const dir = tmpProject();
    try {
      await runIn(dir, ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'], port);

      const quick = requests.find((r) => r.url === '/install/quick-setup');
      const verify = requests.find((r) => /\/verify-and-score/.test(r.url));
      const login = requests.find((r) => /\/login-link/.test(r.url));

      const quickKey = quick.body.idempotency_key;
      const verifyKey = verify.headers['idempotency-key'];
      const loginKey = login.headers['idempotency-key'];

      expect(quickKey).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
      expect(verifyKey).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
      expect(loginKey).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
      // verify-and-score and login-link replay verbatim on key reuse, so they
      // MUST each use a key distinct from quick-setup AND from each other.
      expect(new Set([quickKey, verifyKey, loginKey]).size).toBe(3);

      // Bearer for the REST calls is the laravel token (NOT the mcp token).
      expect(verify.headers.authorization).toBe(`Bearer ${LARAVEL_TOKEN}`);
      expect(login.headers.authorization).toBe(`Bearer ${LARAVEL_TOKEN}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('persists + REUSES the quick-setup key across runs (single-shot replay contract)', async () => {
    const dir = tmpProject();
    try {
      await runIn(dir, ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'], port);
      const firstKey = requests.find((r) => r.url === '/install/quick-setup').body.idempotency_key;
      const persisted = JSON.parse(readFileSync(join(dir, '.tracklution-install.json'), 'utf8'));
      expect(persisted.quick_setup_key).toBe(firstKey);

      requests.length = 0;
      await runIn(dir, ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'], port);
      const secondKey = requests.find((r) => r.url === '/install/quick-setup').body.idempotency_key;
      expect(secondKey).toBe(firstKey); // reused → server replays the same token
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('gitignores the new .mcp.json and the install-key file', async () => {
    const dir = tmpProject();
    try {
      await runIn(dir, ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'], port);
      const gi = readFileSync(join(dir, '.gitignore'), 'utf8');
      expect(gi).toContain('.mcp.json');
      expect(gi).toContain('.tracklution-install.json');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('html: injects the base loader into index.html idempotently', async () => {
    const dir = tmpProject();
    try {
      writeFileSync(join(dir, 'index.html'), '<html><head><title>x</title></head><body></body></html>');
      const first = await runIn(dir, ['--host=claude-code', '--framework=html', '--email=a@b.com', '--url=https://example.com'], port);
      expect(first.json.html_injected).toBe(true);
      const html1 = readFileSync(join(dir, 'index.html'), 'utf8');
      expect(html1).toContain('track.example.com/t.js');
      expect(html1).toContain('tracklution:start');

      // Re-run must NOT double-inject.
      const second = await runIn(dir, ['--host=claude-code', '--framework=html', '--email=a@b.com', '--url=https://example.com'], port);
      expect(second.json.html_injected).toBe(false);
      const html2 = readFileSync(join(dir, 'index.html'), 'utf8');
      expect(html2.match(/tracklution:start/g)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cursor: writes .cursor/mcp.json (no type field) and preserves existing servers', async () => {
    const dir = tmpProject();
    try {
      mkdirSync(join(dir, '.cursor'), { recursive: true });
      writeFileSync(join(dir, '.cursor', 'mcp.json'), JSON.stringify({ mcpServers: { other: { url: 'https://other' } } }));
      const { code, json } = await runIn(dir, ['--host=cursor', '--email=a@b.com', '--url=https://example.com'], port);
      expect(code).toBe(0);
      expect(json.host).toBe('cursor');
      const cfg = JSON.parse(readFileSync(join(dir, '.cursor', 'mcp.json'), 'utf8'));
      expect(cfg.mcpServers.other).toEqual({ url: 'https://other' }); // preserved
      expect(cfg.mcpServers.tracklution).toEqual({
        url: 'https://mcp.tracklution.com/mcp',
        headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      });
      // Cursor's body has no `type` discriminator.
      expect(cfg.mcpServers.tracklution.type).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('missing email/url → need_input (exit 2), no provisioning', async () => {
    const dir = tmpProject();
    try {
      const { code, json } = await runIn(dir, ['--host=claude-code'], port);
      expect(code).toBe(2);
      expect(json.status).toBe('need_input');
      expect(json.missing).toContain('email');
      expect(json.missing).toContain('url');
      expect(requests.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('codex: writes ~/.codex/config.toml as TOML with the http_headers Bearer table', async () => {
    const dir = tmpProject();
    try {
      // Override HOME so expandPath writes the home-dir codex config INTO the
      // temp project, not the real ~/.codex (which would clobber the user's).
      const { code, json } = await runIn(
        dir,
        ['--host=codex', '--email=a@b.com', '--url=https://example.com'],
        port,
        { HOME: dir, USERPROFILE: dir }
      );
      expect(code).toBe(0);
      expect(json.host).toBe('codex');
      const tomlPath = join(dir, '.codex', 'config.toml');
      expect(existsSync(tomlPath)).toBe(true);
      const toml = readFileSync(tomlPath, 'utf8');
      expect(toml).toContain('[mcp_servers.tracklution]');
      expect(toml).toContain('url = "https://mcp.tracklution.com/mcp"');
      // Codex's header table is `http_headers`, NOT `headers`.
      expect(toml).toContain('[mcp_servers.tracklution.http_headers]');
      expect(toml).toContain(`Authorization = "Bearer ${MCP_TOKEN}"`);
      // A home-dir config is NOT gitignored (only project-relative ones are).
      expect(existsSync(join(dir, '.gitignore'))).toBe(true);
      const gi = readFileSync(join(dir, '.gitignore'), 'utf8');
      expect(gi).not.toContain('.codex');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('user-action host (lovable) is refused BEFORE provisioning (no account, no file)', async () => {
    const dir = tmpProject();
    try {
      requests.length = 0;
      const { code, json } = await runIn(
        dir,
        ['--host=lovable', '--email=a@b.com', '--url=https://example.com'],
        port
      );
      expect(code).toBe(2);
      expect(json.status).toBe('unsupported_host');
      expect(json.host).toBe('lovable');
      expect(typeof json.instruction).toBe('string');
      // The whole point: nothing was provisioned and no config file was written.
      expect(requests.length).toBe(0);
      expect(existsSync(join(dir, '.mcp.json'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('auto-detects claude-code from CLAUDE_CODE_ENTRYPOINT env', async () => {
    const dir = tmpProject();
    try {
      const { code, json } = await runIn(
        dir,
        ['--email=a@b.com', '--url=https://example.com'],
        port,
        { CLAUDE_CODE_ENTRYPOINT: 'claude-desktop' }
      );
      expect(code).toBe(0);
      expect(json.host).toBe('claude_code');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('install — duplicate account', () => {
  it('surfaces duplicate_account → oauth_fallback (exit 0, no config written)', async () => {
    const made = makeServer({ duplicate: true });
    const port = await listen(made.server);
    const dir = tmpProject();
    try {
      const { code, json } = await runIn(dir, ['--host=claude-code', '--email=a@b.com', '--url=https://example.com'], port);
      expect(code).toBe(0);
      expect(json.status).toBe('duplicate_account');
      expect(json.next).toBe('oauth_fallback');
      expect(json.recovery_url).toBe('https://app.tracklution.com/login');
      expect(existsSync(join(dir, '.mcp.json'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      made.server.close();
    }
  });
});

describe('install — cross-platform config writing', () => {
  const SNIPPET = {
    tracklution: {
      url: 'https://mcp.tracklution.com/mcp',
      headers: { Authorization: `Bearer ${MCP_TOKEN}` },
    },
  };

  it('cline on win32 writes the %AppData% path, not the macOS [0] entry', () => {
    const dir = tmpProject();
    try {
      const env = { HOME: dir, USERPROFILE: dir, AppData: join(dir, 'AppData', 'Roaming') };
      const res = writeMcpConfig('cline', dir, env, SNIPPET, { platform: 'win32' });
      const norm = res.config_path.replace(/\\/g, '/');
      expect(norm).toContain('AppData/Roaming/Code/User/globalStorage');
      expect(norm).not.toContain('Library'); // the macOS [0] path must NOT be used
      const cfg = JSON.parse(readFileSync(res.config_path, 'utf8'));
      // Cline's body shape (streamableHttp + disabled:false) overlaid with the
      // snippet's Authorization header.
      expect(cfg.mcpServers.tracklution).toEqual({
        url: 'https://mcp.tracklution.com/mcp',
        type: 'streamableHttp',
        disabled: false,
        headers: { Authorization: `Bearer ${MCP_TOKEN}` },
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cline on linux writes the ~/.config path', () => {
    const dir = tmpProject();
    try {
      const env = { HOME: dir, USERPROFILE: dir };
      const res = writeMcpConfig('cline', dir, env, SNIPPET, { platform: 'linux' });
      const norm = res.config_path.replace(/\\/g, '/');
      expect(norm).toContain('.config/Code/User/globalStorage');
      expect(norm).not.toContain('Library');
      expect(existsSync(res.config_path)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('cline on darwin writes the ~/Library path', () => {
    const dir = tmpProject();
    try {
      const env = { HOME: dir, USERPROFILE: dir };
      const res = writeMcpConfig('cline', dir, env, SNIPPET, { platform: 'darwin' });
      const norm = res.config_path.replace(/\\/g, '/');
      expect(norm).toContain('Library/Application Support/Code/User/globalStorage');
      expect(existsSync(res.config_path)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
