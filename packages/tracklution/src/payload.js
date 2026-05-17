// Single source of truth for the agent-readable install payload.
//
// Mirrors the structure of:
//   - https://www.tracklution.com/.well-known/tracklution.json
//   - https://www.tracklution.com/api/install-recipes/
//   - https://www.tracklution.com/agent-install.md (prose form)
//
// Drift is policed by tests/parity.test.js, which fetches the live
// install-recipes endpoint and deep-checks the install_methods block.

export const PAYLOAD_VERSION = '1.0.0';

export const URLS = {
  mcp_url: 'https://mcp.tracklution.com/mcp',
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

export const INSTALL_METHODS = {
  cursor: {
    type: 'file-edit',
    target_paths: ['.cursor/mcp.json', '~/.cursor/mcp.json'],
    merge_key: 'mcpServers.tracklution',
    body: { url: 'https://mcp.tracklution.com/mcp' },
    deeplink:
      'cursor://anysphere.cursor-deeplink/mcp/install?name=tracklution&config=eyJ1cmwiOiJodHRwczovL21jcC50cmFja2x1dGlvbi5jb20vbWNwIn0=',
    post_install_message:
      "Open Cursor \u2192 Settings \u2192 MCP and toggle 'tracklution' on, then say 'go'.",
    min_version: '0.48.0',
    agent_client_value: 'cursor',
  },
  claude_code: {
    type: 'cli',
    command:
      'claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp',
    post_install_message:
      "Run '/mcp' in Claude Code to confirm 'tracklution' is connected, then say 'go'.",
    agent_client_value: 'claude-code',
  },
  codex: {
    type: 'file-edit',
    target_paths: ['~/.codex/config.toml', '%USERPROFILE%/.codex/config.toml'],
    merge_key: 'mcp_servers.tracklution',
    body_toml:
      '[mcp_servers.tracklution]\nurl = "https://mcp.tracklution.com/mcp"\nenabled = true\n',
    post_install_message: "Restart your Codex CLI session, then say 'go'.",
    agent_client_value: 'other',
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
    agent_client_value: 'windsurf',
  },
  lovable: {
    type: 'user-action',
    ui_path:
      'Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add custom MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Open Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add custom MCP server. Use the URL https://mcp.tracklution.com/mcp (no authentication needed). Custom MCP servers are available on paid Lovable plans. Then say 'go'.",
    agent_client_value: 'lovable',
  },
  replit: {
    type: 'user-action',
    ui_path:
      'https://replit.com/integrations \u2192 MCP Servers \u2192 Add MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Go to https://replit.com/integrations \u2192 MCP Servers section \u2192 Add MCP server. Name it 'tracklution'. URL: https://mcp.tracklution.com/mcp (no authentication). Click Test & Save. Then say 'go'.",
    agent_client_value: 'replit',
  },
  bolt: {
    type: 'user-action',
    ui_path: 'Bolt \u2192 Connectors \u2192 Add custom connector',
    value: 'https://mcp.tracklution.com/mcp',
    instruction:
      "Open Bolt \u2192 Connectors \u2192 Add custom connector. URL: https://mcp.tracklution.com/mcp. Transport: HTTP. No authentication needed. Then say 'go'.",
    agent_client_value: 'bolt',
  },
};

export const NEXT_STEPS_FOR_AGENT = [
  'Detect the user\'s host client (Cursor, Claude Code, Codex, Windsurf, Lovable, Replit, Bolt, or other) and apply the matching install_methods entry.',
  'For "file-edit" methods: write/merge the JSON or TOML config file at one of target_paths so that merge_key resolves to body / body_toml. Do not remove other MCP entries in the same file.',
  'For "cli" methods: execute the listed command in the user\'s terminal.',
  'For "user-action" methods: print the instruction string verbatim to the user and stop until they confirm.',
  'Tell the user to enable the \'tracklution\' MCP in their client and reply \'go\'.',
  'After the user confirms, call MCP tool `scout_website` with the user\'s website URL.',
  'Then call `register_and_provision`, `get_installation_scripts`, apply the returned snippets verbatim, and `verify_and_score` until verification.events_verified == true and verification.scoring_complete == true.',
  'Do NOT write tracking code yourself, do NOT call ad-platform APIs directly, do NOT invent endpoint URLs. The MCP at mcp.tracklution.com/mcp is the only supported autonomous install path.',
  'Full per-host protocol with verbatim hand-off lines: https://www.tracklution.com/agent-install.md',
];

export function getPayload({ name = 'tracklution', version = PAYLOAD_VERSION } = {}) {
  return {
    name,
    kind: 'agent-install-bootstrap',
    version,
    ...URLS,
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
    '  Auth:      none for onboarding',
    '',
    '  Cursor       write/merge .cursor/mcp.json:',
    '               mcpServers.tracklution = { "url": "https://mcp.tracklution.com/mcp" }',
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
    "STEP 2 -- Ask the user to enable the 'tracklution' MCP in their client and reply 'go'.",
    '',
    'STEP 3 -- Once enabled, call the MCP onboarding tools in order:',
    '  scout_website -> register_and_provision -> get_installation_scripts',
    '  -> apply snippets -> verify_and_score -> create_login_link',
    '',
    'Reference (always-on, CORS-open):',
    `  Protocol           ${URLS.agent_install_protocol_url}`,
    `  Service directory  ${URLS.service_directory_url}`,
    `  Install recipes    ${URLS.install_recipes_url}`,
    `  llms.txt           ${URLS.llms_txt_url}`,
    '',
    'This tool is a bootstrap wedge only. The MCP at mcp.tracklution.com/mcp is',
    'the canonical install path. Run with --json for structured output.',
    '================================================================================',
  ];
  return lines.join('\n');
}
