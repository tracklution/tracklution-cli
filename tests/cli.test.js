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
  'agent_install_protocol_url',
  'agent_install_html_url',
  'service_directory_url',
  'install_recipes_url',
  'llms_txt_url',
  'llms_full_txt_url',
  'docs_url',
  'signup_url',
  'dashboard_url',
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

  it('--json URL fields all point at tracklution.com surfaces', () => {
    const urlKeys = REQUIRED_TOP_LEVEL_KEYS.filter((k) => k.endsWith('_url'));
    for (const key of urlKeys) {
      const value = payload[key];
      expect(typeof value, `${key} must be a string`).toBe('string');
      expect(value, `${key} must be https://`).toMatch(/^https:\/\//);
      expect(value, `${key} must point at tracklution.com or mcp.tracklution.com`).toMatch(
        /^https:\/\/(www\.|mcp\.)?tracklution\.com\//
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
    expect(joined).toContain('scout_website');
    expect(joined).toContain('register_and_provision');
    expect(joined).toContain('get_installation_scripts');
    expect(joined).toContain('verify_and_score');
  });

  it('default text mode contains the sentinel strings agents pattern-match', () => {
    expect(textOut).toContain('AI AGENT INSTRUCTIONS');
    expect(textOut).toContain('MCP URL:   https://mcp.tracklution.com/mcp');
    expect(textOut).toContain('https://www.tracklution.com/agent-install.md');
    expect(textOut).toContain('scout_website');
    expect(textOut).toContain('--json');
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
