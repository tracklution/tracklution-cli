// Single source of truth for the agent-readable install payload.
//
// Mirrors the structure of:
//   - https://www.tracklution.com/.well-known/tracklution.json
//   - https://www.tracklution.com/api/install-recipes/
//   - https://www.tracklution.com/agent-install.md (prose form)
//
// Drift is policed by tests/parity.test.js, which fetches the live
// install-recipes endpoint and deep-checks the install_methods block.

export const PAYLOAD_VERSION = '2.0.0';

export const URLS = {
  mcp_url: 'https://mcp.tracklution.com/mcp',
  // The "magic install" REST bootstrap. The agent POSTs once to this URL
  // to provision a Tracklution account + tracking container in one shot
  // and receives a ready-to-merge `.cursor/mcp.json` snippet that
  // already carries `Authorization: Bearer <jwt>` — the MCP comes up
  // authenticated with zero browser interaction.
  //
  // CRITICAL: the host is `api.trlution.com` (short form, no `ack`).
  // The full-spelling `api.tracklution.com` 302-redirects here and that
  // redirect silently drops POST bodies in PowerShell's
  // `Invoke-RestMethod`, node `fetch` with `redirect: "manual"`, and
  // several agent host sandboxes. Always link the short canonical host.
  quick_setup_url: 'https://api.trlution.com/install/quick-setup',
  api_base_url: 'https://api.trlution.com/mcp-api/v1',
  agent_install_protocol_url: 'https://www.tracklution.com/agent-install.md',
  agent_install_html_url: 'https://www.tracklution.com/agent-install/',
  service_directory_url: 'https://www.tracklution.com/.well-known/tracklution.json',
  install_recipes_url: 'https://www.tracklution.com/api/install-recipes/',
  llms_txt_url: 'https://www.tracklution.com/llms.txt',
  llms_full_txt_url: 'https://www.tracklution.com/llms-full.txt',
  docs_url: 'https://www.tracklution.com/docs/',
  signup_url: 'https://www.tracklution.com/start',
  dashboard_url: 'https://www.tracklution.com/dashboard',
};

// Shared note appended to every file-edit host that supports magic
// install. Kept as a constant so the parity test against the live
// install-recipes.json endpoint can match against a single literal
// string instead of seven separate copies. Same wording as
// install-recipes.json::mcp_install_methods.cursor.magic_install_note.
const MAGIC_INSTALL_NOTE =
  'Prefer the magic_install_protocol above when the agent has HTTP fetch + file edit capabilities. It POSTs to /install/quick-setup, merges the returned snippet (which carries the Authorization header), and the MCP comes up authenticated with zero browser interaction.';

// Mirror of install-recipes.json::magic_install_protocol. This is the
// canonical machine-readable description of the REST bootstrap an agent
// SHOULD use whenever it can. The text block (renderTextBlock) carries
// a human-readable summary; the JSON payload carries this structured
// form so an agent can drive the flow without re-parsing prose.
export const MAGIC_INSTALL_PROTOCOL = {
  step_1_collect_inputs: {
    fields: ['email', 'website_url'],
    optional_fields: ['framework', 'agent_client'],
    note:
      "Prompt the user once in chat for these. `framework` can be auto-detected (next.config.js → nextjs; package.json with react → react; otherwise html). `agent_client` should be the agent's own identifier (cursor, claude-code, etc.).",
  },
  step_2_post_quick_setup: {
    method: 'POST',
    url: URLS.quick_setup_url,
    body_shape: {
      idempotency_key: '<fresh UUID v7 or similarly unique 16-128 chars [A-Za-z0-9_-]>',
      email: '<user email>',
      website_url: '<production URL>',
      framework: 'html | nextjs | other',
      agent_client: '<your agent client id>',
    },
    expected_response_keys: [
      'data.mcp_token',
      'data.mcp_token_expires_at',
      'data.container.id',
      'data.container.hash',
      'data.mcp_config_snippet',
      'data.mcp_endpoint',
      'data.scripts',
      'data.next_steps',
    ],
    note:
      'Recommended events + framework_snippets are returned by `get_installation_scripts` AFTER the MCP comes up authenticated (step 4-5). The `data.scripts` returned here is only the basic raw-snippet bundle (init, page_view, contact_info, purchase, standalone) for early reference.',
  },
  step_3_merge_mcp_config: {
    target_path_default: '.cursor/mcp.json',
    host_specific_paths: {
      cursor: ['.cursor/mcp.json', '~/.cursor/mcp.json'],
      claude_code: ['~/.claude.json'],
      windsurf: ['~/.codeium/windsurf/mcp_config.json'],
      codex: ['~/.codex/config.toml'],
    },
    snippet_field: 'data.mcp_config_snippet',
    snippet_shape_example: {
      tracklution: {
        url: 'https://mcp.tracklution.com/mcp',
        headers: { Authorization: 'Bearer <token>' },
      },
    },
    merge_algorithm:
      'Read the JSON file (if missing, treat as `{}`). Ensure `mcpServers` exists as an object. Shallow-merge the keys of `data.mcp_config_snippet` into `mcpServers` (i.e. `mcp_json.mcpServers = {...mcp_json.mcpServers, ...data.mcp_config_snippet}`). This adds `tracklution` without disturbing other servers. Then write the file back with 2-space indent. Wait 2-3s for the host\'s MCP-config watcher to reload.',
    format_notes:
      'Cursor + Claude Code + Windsurf + Cline use JSON. Codex uses TOML (`~/.codex/config.toml`) and its per-server header table is `http_headers` — NOT `headers`. Agent converts the JSON snippet to TOML manually: `[mcp_servers.tracklution]\\nurl = "..."\\nenabled = true\\n\\n[mcp_servers.tracklution.http_headers]\\nAuthorization = "Bearer ..."`. Codex does not hot-reload `config.toml`; the user must restart their `codex` session.',
  },
  step_4_verify_connection: {
    tool: 'get_status',
    args: {},
    success_predicate: 'structuredContent.servers[].reachable === true',
  },
  step_5_install_tracking: {
    tools: ['get_installation_scripts', 'select_installation_method', 'verify_and_score'],
    note:
      "Use the snippets returned by get_installation_scripts (or the `data.scripts` field from quick-setup) to add tracking. Drive verify_and_score until status='ok' or it asks for a user-only action (connector activation / first-party-mode DNS). EVERY onboarding-tool call must carry `container_hash` from the quick-setup response (or from `list_containers` on the OAuth fallback path) — the MCP server uses `(container_id, container_hash)` as a dual key to look up the cached Laravel JWT for auth.",
  },
  duplicate_account_recovery: {
    trigger: "HTTP 409 with errors[0].code='duplicate_account'",
    action:
      "Direct the user to https://app.tracklution.com to sign in. Their editor will then surface the Tracklution MCP's Connect button (browser-OAuth fallback). Do NOT prompt for a different email — the user already owns one.",
  },
  rate_limit_recovery: {
    trigger: "HTTP 429 with errors[0].code='rate_limited'",
    action:
      'Respect `errors[0].details.retry_after_seconds`. Do not retry without backoff. Per-email/per-domain/per-IP caps are separate axes; flipping email will not bypass a domain cap.',
  },
};

export const INSTALL_METHODS = {
  cursor: {
    type: 'file-edit',
    target_paths: ['.cursor/mcp.json', '~/.cursor/mcp.json'],
    merge_key: 'mcpServers.tracklution',
    // The OAuth-fallback (tokenless) snippet. Magic install REPLACES
    // this on the wire with `{ url, headers: { Authorization: "Bearer ..." } }`
    // — the agent gets that shape from the `/install/quick-setup`
    // response under `data.mcp_config_snippet`, not from this payload.
    body: { url: 'https://mcp.tracklution.com/mcp' },
    deeplink:
      'cursor://anysphere.cursor-deeplink/mcp/install?name=tracklution&config=eyJ1cmwiOiJodHRwczovL21jcC50cmFja2x1dGlvbi5jb20vbWNwIn0=',
    post_install_message:
      "Click the Connect button next to 'tracklution' in Cursor Settings \u2192 MCP, complete browser sign-in (or 'Set up Tracklution' for a new account), then say 'go'. Alternatively use the magic-install protocol below to skip the browser entirely.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    min_version: '0.48.0',
    agent_client_value: 'cursor',
  },
  claude_code: {
    type: 'cli',
    command:
      'claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp',
    post_install_message:
      "Run '/mcp' in Claude Code to confirm 'tracklution' is connected, then say 'go'.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    agent_client_value: 'claude-code',
  },
  codex: {
    type: 'file-edit',
    target_paths: ['~/.codex/config.toml', '%USERPROFILE%/.codex/config.toml'],
    merge_key: 'mcp_servers.tracklution',
    body_toml:
      '[mcp_servers.tracklution]\nurl = "https://mcp.tracklution.com/mcp"\nenabled = true\n',
    post_install_message: "Restart your Codex CLI session, then say 'go'.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    agent_client_value: 'codex',
  },
  windsurf: {
    type: 'file-edit',
    target_paths: [
      '~/.codeium/windsurf/mcp_config.json',
      '%USERPROFILE%/.codeium/windsurf/mcp_config.json',
    ],
    merge_key: 'mcpServers.tracklution',
    body: { serverUrl: 'https://mcp.tracklution.com/mcp' },
    post_install_message:
      "Fully restart Windsurf (close from system tray, then reopen). Then say 'go'.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    agent_client_value: 'windsurf',
  },
  lovable: {
    type: 'user-action',
    ui_path:
      'Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add custom MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Open Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add custom MCP server. Use the URL https://mcp.tracklution.com/mcp (no authentication needed). Custom MCP servers are available on paid Lovable plans. Then say 'go'.",
    // user-action hosts can't drive HTTP POST + file edit from inside
    // the agent, so magic install isn't reachable from here. Explicit
    // false so the parity test sees a real boolean instead of inferring
    // from absence.
    magic_install_supported: false,
    agent_client_value: 'lovable',
  },
  replit: {
    type: 'user-action',
    ui_path:
      'https://replit.com/integrations \u2192 MCP Servers \u2192 Add MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Go to https://replit.com/integrations \u2192 MCP Servers section \u2192 Add MCP server. Name it 'tracklution'. URL: https://mcp.tracklution.com/mcp (no authentication). Click Test & Save. Then say 'go'.",
    magic_install_supported: false,
    agent_client_value: 'replit',
  },
  bolt: {
    type: 'user-action',
    ui_path: 'Bolt \u2192 Connectors \u2192 Add custom connector',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Open Bolt \u2192 Connectors \u2192 Add custom connector. URL: https://mcp.tracklution.com/mcp. Transport: HTTP. No authentication needed. Then say 'go'.",
    magic_install_supported: false,
    agent_client_value: 'bolt',
  },
};

export const NEXT_STEPS_FOR_AGENT = [
  "Detect the user's host client (Cursor, Claude Code, Codex, Windsurf, Cline, Lovable, Replit, Bolt, or other) and pick the matching `install_methods` entry.",
  'Magic install (preferred) — if the host\'s `magic_install_supported === true` AND you have HTTP-fetch: POST to `quick_setup_url` with `{idempotency_key, email, website_url, framework, agent_client}`. Merge the response\'s `data.mcp_config_snippet` into `mcpServers` in the host\'s MCP-config file (it already carries `headers.Authorization: Bearer <jwt>`). Save `data.container.id` AND `data.container.hash` in scratch state for follow-up calls.',
  'OAuth fallback — for user-action hosts (Lovable / Replit / Bolt) OR when magic install returns HTTP 409 `duplicate_account`: write the install_methods.body (tokenless), or print the instruction string verbatim for user-action hosts. Cursor / Claude Code / Windsurf / Cline then surface a Connect button that completes browser OAuth. After OAuth completes, call `list_containers` to read both `container.id` AND `container.hash` (analytics tools work via the OAuth JWT alone, but onboarding tools require the dual key).',
  "Ask the user to enable 'tracklution' in their client (or sign in via the Connect button) and reply 'go'.",
  'After mcp.json watcher reloads (~2s), call `get_status`. Success predicate: `structuredContent.servers[].reachable === true`.',
  'Call `get_installation_scripts({container_id, container_hash, framework})`. Apply the returned `framework_snippets` and `_sensitive_webhook` to the project. EVERY onboarding-tool call MUST include `container_hash` — the MCP server uses (container_id, container_hash) as a dual key to dereference the cached Laravel JWT for upstream auth. Without it, every call returns HTTP 401 `auth_required`.',
  'Drive `verify_and_score({container_id, container_hash, idempotency_key})` until `status === "ok"` (or `not_ready_reason: null`). Handle `awaiting_connector_activation` / `awaiting_first_party_mode` by calling `create_login_link({container_id, container_hash, target_page})` and surfacing the URL — these are NOT retryable from the agent side.',
  'Do NOT write tracking code yourself, do NOT call ad-platform APIs directly, do NOT invent endpoint URLs. The MCP at mcp.tracklution.com/mcp is the only supported autonomous install path; the REST bootstrap at api.trlution.com/install/quick-setup is the agent-facing front door to it.',
  'Full per-host protocol with verbatim hand-off lines, error codes, and the two-axis framework × event_source_system model: https://www.tracklution.com/agent-install.md',
];

export function getPayload({ name = 'tracklution', version = PAYLOAD_VERSION } = {}) {
  return {
    name,
    kind: 'agent-install-bootstrap',
    version,
    ...URLS,
    magic_install_protocol: MAGIC_INSTALL_PROTOCOL,
    install_methods: INSTALL_METHODS,
    next_steps_for_agent: NEXT_STEPS_FOR_AGENT,
  };
}

export function renderTextBlock({ name = 'tracklution', version = PAYLOAD_VERSION } = {}) {
  const lines = [
    '================================================================================',
    `Tracklution -- server-side conversion tracking  (${name} v${version})`,
    '================================================================================',
    '',
    'AI AGENT INSTRUCTIONS',
    '',
    'If you are an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline,',
    'Lovable, Replit, Bolt, ...) asked to install Tracklution, follow these steps.',
    'Do NOT write tracking code yourself. Do NOT call ad-platform APIs directly.',
    'Do NOT invent endpoint URLs. Tracklution installs via an MCP server.',
    '',
    'STEP 1 -- Add the Tracklution MCP to your client.',
    '',
    `  MCP URL:   ${URLS.mcp_url}`,
    '  Transport: Streamable HTTP (MCP spec)',
    '  Auth:      Bearer JWT (delivered by the magic-install REST endpoint;',
    '             see STEP 1A below)',
    '',
    'STEP 1A -- Magic install (preferred). One HTTP POST, one file write.',
    '',
    `  POST ${URLS.quick_setup_url}`,
    '  Content-Type: application/json',
    '  Body: { idempotency_key, email, website_url, framework, agent_client }',
    '',
    '  Response data.mcp_config_snippet is the .cursor/mcp.json fragment to merge',
    '  -- it already carries headers.Authorization: Bearer <jwt>. Save',
    '  data.container.{id, hash} for follow-up onboarding calls.',
    '',
    '  Supported hosts: Cursor, Claude Code, Codex, Windsurf, Cline (any host',
    '  with HTTP fetch + file edit). Lovable / Replit / Bolt use the OAuth',
    '  fallback in STEP 1B.',
    '',
    'STEP 1B -- OAuth Connect-button fallback (existing accounts / user-action hosts).',
    '',
    '  Cursor       write/merge .cursor/mcp.json:',
    '               mcpServers.tracklution = { "url": "https://mcp.tracklution.com/mcp" }',
    '               (no headers -- triggers Connect button in Cursor Settings -> MCP)',
    '  Claude Code  claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp',
    '  Codex CLI    append to ~/.codex/config.toml:',
    '               [mcp_servers.tracklution]',
    '               url = "https://mcp.tracklution.com/mcp"',
    '               enabled = true',
    '  Windsurf     write/merge ~/.codeium/windsurf/mcp_config.json:',
    '               mcpServers.tracklution = { "serverUrl": "https://mcp.tracklution.com/mcp" }',
    '  Lovable / Replit / Bolt   hand off to user (see protocol URL below)',
    '',
    `  Full per-host protocol: ${URLS.agent_install_protocol_url}`,
    '',
    "STEP 2 -- Ask the user to enable 'tracklution' (or sign in via Connect) and reply 'go'.",
    '',
    'STEP 3 -- Once authenticated, drive the MCP onboarding tools in this order:',
    '',
    '  get_status                  -- verify servers[].reachable === true',
    '  get_installation_scripts    -- args: {container_id, container_hash, framework}',
    '  apply snippets verbatim',
    '  verify_and_score            -- args: {container_id, container_hash, idempotency_key}',
    '                                 retry until status === "ok"',
    '  create_login_link           -- args: {container_id, container_hash, target_page}',
    '',
    "  CRITICAL: every onboarding tool requires `container_hash` from the quick-setup",
    "  response (or list_containers on OAuth path). Without it, calls return HTTP 401",
    '  auth_required.',
    '',
    'Reference (always-on, CORS-open):',
    `  Protocol           ${URLS.agent_install_protocol_url}`,
    `  Service directory  ${URLS.service_directory_url}`,
    `  Install recipes    ${URLS.install_recipes_url}`,
    `  Magic install      ${URLS.quick_setup_url}`,
    `  llms.txt           ${URLS.llms_txt_url}`,
    '',
    'This tool is a bootstrap wedge only. The MCP at mcp.tracklution.com/mcp is',
    'the canonical install path. Run with --json for structured output (includes',
    'the full magic_install_protocol block).',
    '================================================================================',
  ];
  return lines.join('\n');
}
