import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const canonicalBin = resolve(repoRoot, 'packages/tracklution/bin/cli.js');
const canonicalPkg = JSON.parse(
  readFileSync(resolve(repoRoot, 'packages/tracklution/package.json'), 'utf8')
);

function run(args = []) {
  return spawnSync(process.execPath, [canonicalBin, ...args], {
    encoding: 'utf8',
  });
}

const REQUIRED_TOP_LEVEL_KEYS = [
  'name',
  'kind',
  'version',
  'mcp_url',
  // v2: magic-install REST bootstrap (`POST /install/quick-setup`) is the
  // canonical entry point. The other tracking endpoints share the same
  // short prod host `api.trlution.com` — note the deliberate misspelling
  // (no `ack`). The full-spelling `api.tracklution.com` 302-redirects
  // here and the redirect silently drops POST bodies on several agent
  // HTTP clients (PowerShell Invoke-RestMethod, node fetch with
  // redirect:"manual", etc.). Pin the short host.
  'quick_setup_url',
  'api_base_url',
  'agent_install_protocol_url',
  'agent_install_html_url',
  'service_directory_url',
  'install_recipes_url',
  'llms_txt_url',
  'llms_full_txt_url',
  'docs_url',
  'signup_url',
  'dashboard_url',
  'magic_install_protocol',
  'install_methods',
  'next_steps_for_agent',
];

const REQUIRED_HOSTS = [
  'cursor',
  'claude_code',
  'codex',
  'windsurf',
  'lovable',
  'replit',
  'bolt',
];

// Hosts where the agent CAN drive the REST bootstrap from inside its
// own loop (HTTP fetch + file edit). Lovable / Replit / Bolt are
// user-action hosts where the agent can only print an instruction; they
// fall back to the OAuth Connect-button path.
const MAGIC_INSTALL_FILE_EDIT_HOSTS = ['cursor', 'claude_code', 'codex', 'windsurf'];
const MAGIC_INSTALL_USER_ACTION_HOSTS = ['lovable', 'replit', 'bolt'];

describe('canonical tracklution CLI', () => {
  let payload;
  let textOut;

  beforeAll(() => {
    const j = run(['--json']);
    expect(j.status, `--json stderr: ${j.stderr}`).toBe(0);
    payload = JSON.parse(j.stdout);

    const t = run([]);
    expect(t.status, `default stderr: ${t.stderr}`).toBe(0);
    textOut = t.stdout;
  });

  it('--version matches package.json and writes only the version', () => {
    const v = run(['--version']);
    expect(v.status).toBe(0);
    expect(v.stdout.trim()).toBe(canonicalPkg.version);
    expect(v.stderr).toBe('');
  });

  it('-v is a synonym for --version', () => {
    const v = run(['-v']);
    expect(v.status).toBe(0);
    expect(v.stdout.trim()).toBe(canonicalPkg.version);
  });

  it('--help prints usage and exits 0', () => {
    const h = run(['--help']);
    expect(h.status).toBe(0);
    expect(h.stdout).toContain('Usage:');
    expect(h.stdout).toContain('npx tracklution');
    expect(h.stderr).toBe('');
  });

  it('-h is a synonym for --help', () => {
    const h = run(['-h']);
    expect(h.status).toBe(0);
    expect(h.stdout).toContain('Usage:');
  });

  it('--json emits parseable JSON with every required top-level key', () => {
    for (const key of REQUIRED_TOP_LEVEL_KEYS) {
      expect(payload, `--json output missing key '${key}'`).toHaveProperty(key);
    }
    expect(payload.name).toBe('tracklution');
    expect(payload.kind).toBe('agent-install-bootstrap');
    expect(payload.version).toBe(canonicalPkg.version);
    expect(payload.mcp_url).toBe('https://mcp.tracklution.com/mcp');
  });

  it('--json URL fields all point at canonical Tracklution surfaces', () => {
    const urlKeys = REQUIRED_TOP_LEVEL_KEYS.filter((k) => k.endsWith('_url'));
    // Allowed hosts:
    //   www.tracklution.com  -- marketing + docs + agent-install.md + recipes
    //   mcp.tracklution.com  -- MCP server
    //   api.trlution.com     -- SHORT prod API host (no `ack`). Used by
    //                           quick_setup_url + api_base_url. The
    //                           full-spelling `api.tracklution.com`
    //                           302-redirects here and the redirect
    //                           drops POST bodies on several HTTP
    //                           clients, so the short host is the only
    //                           one safe to publish as a callable URL.
    const allowedHost = /^https:\/\/(www\.tracklution\.com|mcp\.tracklution\.com|api\.trlution\.com)\//;
    for (const key of urlKeys) {
      const value = payload[key];
      expect(typeof value, `${key} must be a string`).toBe('string');
      expect(value, `${key} must be https://`).toMatch(/^https:\/\//);
      expect(value, `${key} must point at an allowed Tracklution host`).toMatch(
        allowedHost
      );
    }
  });

  it('--json install_methods covers every supported host with correct shape', () => {
    expect(Object.keys(payload.install_methods).sort()).toEqual(
      [...REQUIRED_HOSTS].sort()
    );
    for (const host of REQUIRED_HOSTS) {
      const entry = payload.install_methods[host];
      expect(entry, `host '${host}' missing`).toBeDefined();
      expect(typeof entry.type, `host '${host}' type`).toBe('string');
      expect(['file-edit', 'cli', 'user-action']).toContain(entry.type);
      expect(typeof entry.agent_client_value).toBe('string');
      if (entry.type === 'file-edit') {
        expect(Array.isArray(entry.target_paths)).toBe(true);
        expect(entry.target_paths.length).toBeGreaterThanOrEqual(1);
        expect(typeof entry.merge_key).toBe('string');
        expect(entry.body || entry.body_toml).toBeTruthy();
      }
      if (entry.type === 'cli') {
        expect(typeof entry.command).toBe('string');
        expect(entry.command).toContain('https://mcp.tracklution.com/mcp');
      }
      if (entry.type === 'user-action') {
        expect(typeof entry.ui_path).toBe('string');
        expect(typeof entry.instruction).toBe('string');
        expect(entry.value).toBe('https://mcp.tracklution.com/mcp');
      }
    }
  });

  it('Cursor deeplink decodes to the canonical MCP URL', () => {
    const deeplink = payload.install_methods.cursor.deeplink;
    expect(deeplink).toMatch(
      /^cursor:\/\/anysphere\.cursor-deeplink\/mcp\/install\?/
    );
    const match = /[?&]config=([^&]+)/.exec(deeplink);
    expect(match, 'deeplink must carry a config query param').not.toBeNull();
    const decoded = JSON.parse(
      Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8')
    );
    expect(decoded).toEqual({ url: payload.mcp_url });
    expect(deeplink).toContain('name=tracklution');
  });

  it('--json next_steps_for_agent is an array of non-empty strings', () => {
    expect(Array.isArray(payload.next_steps_for_agent)).toBe(true);
    expect(payload.next_steps_for_agent.length).toBeGreaterThanOrEqual(5);
    for (const step of payload.next_steps_for_agent) {
      expect(typeof step).toBe('string');
      expect(step.length).toBeGreaterThan(0);
    }
    const joined = payload.next_steps_for_agent.join('\n');
    // v2: the protocol's preferred path is the REST bootstrap to
    // /install/quick-setup, NOT the v1 `scout_website` ->
    // `register_and_provision` sequence. The MCP install JWT delivered
    // by quick-setup unlocks the post-install onboarding tools, all of
    // which require `container_hash` for the dual-key auth lookup.
    expect(joined).toContain('quick_setup_url');
    expect(joined).toContain('container_hash');
    expect(joined).toContain('get_installation_scripts');
    expect(joined).toContain('verify_and_score');
    expect(joined).toContain('create_login_link');
    expect(joined).toContain('get_status');
    // The v1 `scout_website` step was dropped in v2 — the REST endpoint
    // handles website-scout server-side. If a future agent loops on
    // this string, it would dead-end. Assert it's gone.
    expect(joined).not.toMatch(/\bscout_website\b/);
  });

  it('default text mode contains the sentinel strings agents pattern-match', () => {
    expect(textOut).toContain('AI AGENT INSTRUCTIONS');
    expect(textOut).toContain('MCP URL:   https://mcp.tracklution.com/mcp');
    expect(textOut).toContain('https://www.tracklution.com/agent-install.md');
    // v2: replace the v1 `scout_website` mention with the actual
    // post-install tool sequence that follows the REST bootstrap.
    expect(textOut).toContain('Bearer JWT');
    expect(textOut).toContain('/install/quick-setup');
    expect(textOut).toContain('container_hash');
    expect(textOut).toContain('get_installation_scripts');
    expect(textOut).toContain('verify_and_score');
    expect(textOut).toContain('--json');
  });

  // v2 regression — lock the magic-install protocol contract that ships
  // alongside the install methods. Mirrors install-recipes.json's
  // `magic_install_protocol` block byte-for-byte; if the API server
  // ever rotates the URL or the step shape, the parity test against
  // the live endpoint catches it. This test catches local drift.
  it('--json magic_install_protocol carries the canonical step layout', () => {
    const proto = payload.magic_install_protocol;
    expect(typeof proto, 'magic_install_protocol must be an object').toBe('object');
    for (const step of [
      'step_1_collect_inputs',
      'step_2_post_quick_setup',
      'step_3_merge_mcp_config',
      'step_4_verify_connection',
      'step_5_install_tracking',
      'duplicate_account_recovery',
      'rate_limit_recovery',
    ]) {
      expect(proto, `magic_install_protocol missing step '${step}'`).toHaveProperty(step);
    }
    // step_2's URL must match the top-level quick_setup_url — agents
    // that read the structured form should not have to cross-reference
    // a separate source of truth.
    expect(proto.step_2_post_quick_setup.url).toBe(payload.quick_setup_url);
    // step_2's body shape must list every field the Laravel
    // QuickSetupRequest validator requires (idempotency_key, email,
    // website_url, framework). Optional fields (agent_client) may or
    // may not be present.
    const bodyShape = proto.step_2_post_quick_setup.body_shape;
    for (const required of ['idempotency_key', 'email', 'website_url', 'framework']) {
      expect(bodyShape, `body_shape missing '${required}'`).toHaveProperty(required);
    }
  });

  it('--json install_methods reports magic_install_supported per host', () => {
    for (const host of MAGIC_INSTALL_FILE_EDIT_HOSTS) {
      const entry = payload.install_methods[host];
      expect(entry.magic_install_supported, `host '${host}'`).toBe(true);
      expect(typeof entry.magic_install_note, `host '${host}' note`).toBe('string');
      expect(entry.magic_install_note.length, `host '${host}' note`).toBeGreaterThan(0);
    }
    for (const host of MAGIC_INSTALL_USER_ACTION_HOSTS) {
      const entry = payload.install_methods[host];
      // user-action hosts CANNOT drive magic install from inside the
      // agent (no HTTP-fetch+file-edit). Either the flag is explicitly
      // false or it's omitted.
      expect(
        entry.magic_install_supported,
        `host '${host}' must NOT advertise magic_install_supported: true`
      ).not.toBe(true);
    }
  });

  it('--json quick_setup_url uses the short prod API host (no `ack`)', () => {
    // api.tracklution.com 302-redirects here and the redirect drops POST
    // bodies on several agent HTTP clients. Pin the short host.
    expect(payload.quick_setup_url).toBe('https://api.trlution.com/install/quick-setup');
    expect(payload.api_base_url).toMatch(/^https:\/\/api\.trlution\.com\/mcp-api\//);
    // Negative assertion — the long host must not appear as a callable
    // URL anywhere in the JSON payload (substring scan).
    const json = JSON.stringify(payload);
    expect(json).not.toMatch(/https?:\/\/api\.tracklution\.com/);
  });

  it('default text mode output ends with a trailing newline (well-behaved CLI)', () => {
    expect(textOut.endsWith('\n')).toBe(true);
  });

  it('--json output ends with a trailing newline (well-behaved CLI)', () => {
    const j = run(['--json']);
    expect(j.stdout.endsWith('\n')).toBe(true);
  });

  it('--json mcp_url is consistent with every install method that names a URL', () => {
    const mcpUrl = payload.mcp_url;
    expect(payload.install_methods.cursor.body.url).toBe(mcpUrl);
    expect(payload.install_methods.windsurf.body.serverUrl).toBe(mcpUrl);
    expect(payload.install_methods.lovable.value).toBe(mcpUrl);
    expect(payload.install_methods.replit.value).toBe(mcpUrl);
    expect(payload.install_methods.bolt.value).toBe(mcpUrl);
    expect(payload.install_methods.claude_code.command).toContain(mcpUrl);
    expect(payload.install_methods.codex.body_toml).toContain(mcpUrl);
  });
});
