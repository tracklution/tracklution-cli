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
  // v5: dedicated reference doc URL for per-host quirks, error code
  // tables, two-axis model. Pinned here so consumers can deep-link
  // without parsing the contract.
  'agent_install_reference_url',
  'agent_install_html_url',
  'service_directory_url',
  'install_recipes_url',
  'llms_txt_url',
  'llms_full_txt_url',
  'docs_url',
  'signup_url',
  'dashboard_url',
  // v5: structured state-machine form of the agent contract. Agents
  // consuming `npx tracklution --json` drive the conversation from
  // this block.
  'agent_contract',
  'magic_install_protocol',
  'install_methods',
  'next_steps_for_agent',
];

const REQUIRED_HOSTS = [
  'cursor',
  'claude_code',
  'codex',
  'windsurf',
  // v5: cline promoted to a first-class entry (was already in the
  // contract's host_detection and in agent-install-reference.md; the
  // install-recipes.json mirror added it explicitly). Adding here so
  // parity with the live install-recipes endpoint holds.
  'cline',
  'lovable',
  'replit',
  'bolt',
];

// Hosts where the agent CAN drive the REST bootstrap from inside its
// own loop (HTTP fetch + file edit). Lovable / Replit / Bolt are
// user-action hosts where the agent can only print an instruction; they
// fall back to the OAuth Connect-button path.
const MAGIC_INSTALL_FILE_EDIT_HOSTS = ['cursor', 'claude_code', 'codex', 'windsurf', 'cline'];
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

  // v5 regression — lock the agent_contract block that drives the
  // structured form of the conversation. install-recipes.json
  // mirrors this; the parity test deep-checks both surfaces against
  // each other. A regression that quietly removes a turn-3 variant,
  // a silence rule, or a host detector reduces the contract surface
  // — must surface in CI rather than at runtime.
  it('--json agent_contract block carries the canonical contract structure', () => {
    const contract = payload.agent_contract;
    expect(typeof contract, 'agent_contract must be an object').toBe('object');

    // All required top-level keys present.
    const requiredKeys = [
      'version',
      'primary_doc',
      'reference_doc',
      'host_detection',
      'turn_1_question',
      'turn_2_branches',
      'turn_3_handoff_magic_file_edit',
      'turn_3_handoff_magic_cli',
      'turn_3_handoff_oauth_explicit',
      'turn_3_handoff_oauth_duplicate',
      'turn_4_sequence_magic',
      'turn_4_sequence_oauth',
      'turn_4_recovery_401',
      'turn_4_recovery_tool_not_found',
      'turn_4_recovery_tool_not_found_message',
      'turn_4_final_ok',
      'turn_4_final_needs_action',
      'failure_clause',
      'silence_rules',
    ];
    for (const k of requiredKeys) {
      expect(contract, `agent_contract missing key '${k}'`).toHaveProperty(k);
    }

    // host_detection must cover all 8 supported hosts (matches
    // REQUIRED_HOSTS plus 'claude_code' which is already in the list
    // — the 8th is the same one in cli.test.js's REQUIRED_HOSTS).
    for (const host of [
      'cursor',
      'claude_code',
      'codex',
      'windsurf',
      'cline',
      'lovable',
      'replit',
      'bolt',
    ]) {
      expect(
        contract.host_detection,
        `agent_contract.host_detection.${host}`
      ).toHaveProperty(host);
      expect(Array.isArray(contract.host_detection[host])).toBe(true);
    }

    // turn_1_question is load-bearing user-facing text. Substring
    // match on the two anchors agents pattern-match against ("email
    // and website URL" + "`advanced`") so non-critical wording (the
    // example email, punctuation) can evolve.
    expect(typeof contract.turn_1_question).toBe('string');
    expect(contract.turn_1_question).toContain('Tracklution needs your email and website URL');
    expect(contract.turn_1_question).toContain('`advanced`');

    // advanced_synonyms gives the LLM enough freedom to intent-match
    // typos and equivalents. The user's own example had a typo
    // ("avanced") — without synonyms the literal-match would have
    // failed.
    const synonyms = contract.turn_2_branches.advanced_synonyms;
    expect(Array.isArray(synonyms)).toBe(true);
    expect(synonyms.length).toBeGreaterThanOrEqual(4);
    expect(synonyms).toContain('advanced');
    expect(synonyms).toContain('oauth');

    // Both 409 paths (status code OR next_action.tool signal) must
    // resolve to oauth_fallback — that's the load-bearing wire
    // signal for silent duplicate-account recovery.
    expect(contract.turn_2_branches.api_409_duplicate_account).toBe('oauth_fallback');
    expect(contract.turn_2_branches.api_next_action_oauth_fallback).toBe('oauth_fallback');

    // turn_4_sequence_magic lists the canonical 5 post-install steps.
    const seq = contract.turn_4_sequence_magic;
    expect(Array.isArray(seq)).toBe(true);
    expect(seq).toContain('get_status');
    expect(seq).toContain('get_installation_scripts');
    expect(seq).toContain('apply_snippets');
    expect(seq).toContain('verify_and_score');
    expect(seq).toContain('create_login_link');

    // silence_rules: 7 explicit DO-NOTs + the load-bearing exception
    // for the login URL. Removing any rule weakens the contract — pin.
    const rules = contract.silence_rules;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThanOrEqual(7);
    const joined = rules.join('\n').toLowerCase();
    expect(joined).toContain('narrate');
    expect(joined).toContain('echo');
    expect(joined).toContain('paraphrase');
    expect(joined).toContain('error code');
    expect(joined).toContain('exception');
    expect(joined).toContain('create_login_link');
  });

  // v5 regression — lock the expected_response_keys trim. Adding
  // `data.scripts` or `data.next_steps` back inflates the agent's
  // pre-MCP context window and breaks the silence rules' "no
  // echoing JSON envelopes" directive.
  it('--json magic_install_protocol.step_2 dropped data.scripts and data.next_steps', () => {
    const keys = payload.magic_install_protocol.step_2_post_quick_setup.expected_response_keys;
    expect(Array.isArray(keys)).toBe(true);
    expect(keys, 'expected_response_keys must NOT advertise data.scripts').not.toContain(
      'data.scripts'
    );
    expect(keys, 'expected_response_keys must NOT advertise data.next_steps').not.toContain(
      'data.next_steps'
    );
    // Positive: the four handles the agent actually needs.
    expect(keys).toContain('data.mcp_token');
    expect(keys).toContain('data.container.id');
    expect(keys).toContain('data.container.hash');
    expect(keys).toContain('data.mcp_config_snippet');
  });

  // v5 regression: payload.js's magic_install_protocol.step_3 must
  // mirror install-recipes.json's cli_commands.claude_code block.
  // The npm-published payload is what `npx tracklution --json`
  // surfaces — agents driving the install from that JSON alone need
  // BOTH the tokenless and magic-install Claude Code command forms.
  // Without this test, a future payload.js edit that removed the
  // cli_commands block would silently break Claude Code magic install
  // for agents that don't fetch install-recipes.json separately.
  it('--json magic_install_protocol.step_3 carries cli_commands.claude_code (mirrors install-recipes.json)', () => {
    const step3 = payload.magic_install_protocol.step_3_merge_mcp_config;
    expect(step3.host_specific_paths, 'host_specific_paths must be present').toBeDefined();
    // claude_code is intentionally absent from host_specific_paths —
    // it's a CLI host, not file-edit. v3-era drift had `~/.claude.json`
    // listed there, which would have caused agents to silently
    // corrupt that file. The v5 fix removed the entry.
    expect(step3.host_specific_paths.claude_code).toBeUndefined();
    expect(step3.host_specific_paths_note).toBeDefined();
    expect(String(step3.host_specific_paths_note)).toMatch(/Claude Code.*CLI host/i);

    // cli_commands.claude_code carries BOTH the tokenless form (OAuth
    // fallback) and the magic-install template (Bearer token via
    // --header flag).
    const cli = step3.cli_commands;
    expect(cli, 'step_3.cli_commands must be present').toBeDefined();
    expect(cli.claude_code, 'cli_commands.claude_code must be present').toBeDefined();
    const cc = cli.claude_code;
    expect(typeof cc.tokenless_form).toBe('string');
    expect(typeof cc.with_bearer_token_template).toBe('string');

    // Pin the load-bearing fragments.
    expect(cc.with_bearer_token_template).toContain('{mcp_token}');
    expect(cc.with_bearer_token_template).toContain('--header');
    expect(cc.with_bearer_token_template).toContain('Authorization: Bearer');

    // Both forms MUST use --transport http per Claude Code 1.x
    // compatibility (anthropics/claude-code#46835). The legacy
    // --transport streamable-http silently fails with "Invalid
    // transport type".
    expect(cc.tokenless_form).toMatch(/--transport http\b/);
    expect(cc.with_bearer_token_template).toMatch(/--transport http\b/);
    expect(cc.tokenless_form).not.toContain('streamable-http');
    expect(cc.with_bearer_token_template).not.toContain('streamable-http');
  });

  it('--json magic_install_protocol.duplicate_account_recovery references oauth_fallback', () => {
    const recovery = payload.magic_install_protocol.duplicate_account_recovery;
    expect(typeof recovery.trigger).toBe('string');
    expect(typeof recovery.action).toBe('string');
    expect(recovery.trigger).toMatch(/oauth_fallback/);
    expect(recovery.action.toLowerCase()).toContain('oauth_fallback');
    expect(recovery.action.toLowerCase()).toContain('do not prompt');
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
