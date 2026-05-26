// Single source of truth for the agent-readable install payload.
//
// Mirrors the structure of:
//   - https://www.tracklution.com/.well-known/tracklution.json
//   - https://www.tracklution.com/api/install-recipes/
//   - https://www.tracklution.com/agent-install.md (the agent contract)
//   - https://www.tracklution.com/agent-install-reference.md (per-host detail)
//
// Drift is policed by tests/parity.test.js, which fetches the live
// install-recipes endpoint and deep-checks the install_methods block AND
// the agent_contract block.

export const PAYLOAD_VERSION = '3.1.0';

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
  agent_install_reference_url: 'https://www.tracklution.com/agent-install-reference.md',
  agent_install_html_url: 'https://www.tracklution.com/agent-install/',
  service_directory_url: 'https://www.tracklution.com/.well-known/tracklution.json',
  install_recipes_url: 'https://www.tracklution.com/api/install-recipes/',
  llms_txt_url: 'https://www.tracklution.com/llms.txt',
  llms_full_txt_url: 'https://www.tracklution.com/llms-full.txt',
  docs_url: 'https://www.tracklution.com/docs/',
  signup_url: 'https://www.tracklution.com/start',
  dashboard_url: 'https://www.tracklution.com/dashboard',
};

// The Agent Install Contract — structured state-machine form of the
// conversation contract published at agent-install.md. Agents that
// consume the JSON payload (via `npx tracklution --json` or via the
// install-recipes endpoint) drive the install from this block:
//   - host_detection: identify which client the agent is running in.
//   - turn_1_question: verbatim user-facing prompt (case for paraphrasing
//     by the agent is `turn_1_skip_if`).
//   - turn_2_branches: how to interpret the user reply (magic install,
//     OAuth, or re-ask).
//   - turn_3_handoff_*: verbatim hand-off message variants per branch +
//     host class.
//   - turn_4_sequence_*: the silent tool sequence after the user says `go`.
//   - silence_rules: the 7 DO-NOT directives + the login URL exception.
//
// Mirrors install-recipes.json::agent_contract byte-for-byte. The
// parity test deep-checks this block against the live endpoint.
export const AGENT_CONTRACT = {
  version: '1.0.0',
  primary_doc: URLS.agent_install_protocol_url,
  reference_doc: URLS.agent_install_reference_url,
  host_detection: {
    cursor: ['dir:.cursor/', 'file:~/.cursor/mcp.json', 'process:cursor'],
    claude_code: ['path:claude', 'dir:~/.claude/'],
    codex: ['path:codex', 'dir:~/.codex/'],
    windsurf: ['dir:~/.codeium/windsurf/', 'process:windsurf'],
    cline: ['dir:saoudrizwan.claude-dev', 'dir:~/.cline/'],
    lovable: ['host:lovable.dev'],
    replit: ['host:replit.com'],
    bolt: ['host:bolt.new'],
  },
  turn_1_question:
    'Tracklution needs your email and website URL. Reply with both (e.g., you@example.com mysite.com). Type `advanced` to use OAuth instead.',
  turn_1_skip_if: 'initial prompt already contains both email and url',
  turn_2_branches: {
    email_and_url: 'magic_install',
    advanced_synonyms: ['advanced', 'oauth', 'login', 'sign in', 'connect', 'i have an account'],
    advanced: 'oauth_install',
    malformed_url: 'ask_once_then_retry',
    api_409_duplicate_account: 'oauth_fallback',
    api_next_action_oauth_fallback: 'oauth_fallback',
  },
  turn_3_handoff_magic_file_edit:
    "I added the Tracklution MCP. Enable it in your editor's MCP settings, then reply `go`.",
  turn_3_handoff_magic_cli:
    "I added the Tracklution MCP via the Claude CLI. Run `/mcp` to confirm it's connected, then reply `go`.",
  turn_3_handoff_oauth_explicit:
    'I added a tokenless Tracklution MCP entry. Enable it in your editor and click Connect to sign in, then reply `go`.',
  turn_3_handoff_oauth_duplicate:
    'Looks like you already have a Tracklution account. Enable the Tracklution MCP and click Connect to sign in, then reply `go`.',
  turn_4_sequence_magic: [
    'get_status',
    'get_installation_scripts',
    'apply_snippets',
    'verify_and_score',
    'get_next_steps',
    'create_login_link',
  ],
  turn_4_sequence_oauth: [
    'get_status',
    'list_containers',
    'ask_oauth_branch_question',
    'register_and_provision_OR_match_by_website_url',
    'get_installation_scripts',
    'apply_snippets',
    'verify_and_score',
    'get_next_steps',
    'create_login_link',
  ],
  // v5.1: Turn 4 Step 2 OAuth-branch question. Asks the OAuth-authed
  // user whether to add a NEW website (auth_token + register_and_provision)
  // or connect to an EXISTING container (list_containers + match by URL).
  // Fixes the "I need your name and email" hallucination bug where the
  // agent had no authoritative path for the brand-new + advanced case.
  turn_4_oauth_branch_question:
    "You're signed in. Add Tracklution to a NEW website, or connect to an EXISTING container? Reply `new <url>` or `existing`.",
  turn_4_oauth_branch_new_synonyms: ['new', 'add', 'install', 'create'],
  turn_4_oauth_branch_existing_synonyms: ['existing', 'connect', 'pick', 'choose'],
  turn_4_oauth_branch_skip_question_when:
    'list_containers returns 0 containers (go straight to new <url>)',
  turn_4_oauth_new_branch_call:
    'register_and_provision({auth_token, website_url, framework, agent_client, idempotency_key}) WITHOUT email/name -- server reads identity from JWT',
  turn_4_recovery_401: 'silent_oauth_fallback',
  turn_4_recovery_tool_not_found: 'ask_user_to_reload_or_open_new_chat',
  turn_4_recovery_tool_not_found_message:
    "The MCP isn't visible in this chat session yet \u2014 open a new chat and say `continue Tracklution install`, run Cmd/Ctrl+Shift+P \u2192 Developer: Reload Window, or toggle `tracklution` off/on in your MCP settings. Then reply `go`.",
  turn_4_recovery_multi_client_ambiguous:
    'Surface next_action.reason verbatim and EXIT. Do NOT call any other MCP tool. The user finishes setup in the dashboard.',
  // v5.1: verify_and_score now routes by not_ready_reason class. Old
  // behavior bundled all event-shape gaps into one "retry per budget"
  // bucket, which caused the agent to retry verify_and_score on a fresh
  // install with only PageView seen -- wasted user time and felt broken.
  // New: only_pageview_seen / missing_bottom_funnel_event are
  // "user-action-needed, no retry, transition to Turn 5 scored hand-off."
  verify_and_score_routing: {
    done_user_action_no_retry: [
      'ok',
      'awaiting_connector_activation',
      'awaiting_first_party_mode',
      'only_pageview_seen',
      'missing_bottom_funnel_event',
    ],
    transient_retry_with_budget: [
      'no_events_after_install',
      'script_not_seen',
      'event_not_received_yet',
      'events_processing',
    ],
    code_fix_retry_once: ['missing_contact_info', 'domain_mismatch'],
    note:
      "All paths converge on the Turn 5 scored hand-off. only_pageview_seen and missing_bottom_funnel_event explicitly DO NOT retry -- the user must trigger the event on the live site; a 30s wait won't help.",
  },
  // v5.1: legacy aliases retained for backward compat. The canonical
  // multi-line template lives at turn_5_scored_handoff.template below.
  turn_4_final_ok:
    'Tracking is live. Tracklution score: <overall_progress>/100. Top 3 ways to reach 100%: ... Open: <login_link_url> (see turn_5_scored_handoff.template for the canonical multi-line form).',
  turn_4_final_needs_action:
    '<verification.message> Tracklution score: <overall_progress>/100. Top 3 ways to reach 100%: ... Open: <login_link_url> (see turn_5_scored_handoff.template for the canonical multi-line form).',
  // v5.1: Turn 5 scored hand-off. After verify_and_score routes back,
  // call get_next_steps + create_login_link, then send a single
  // multi-line message containing the Tracklution score (0-100) + top 3
  // next_steps. This is the gamification surface that sells Tracklution
  // post-install ("each percent point = more accurate attribution = more
  // efficient ad spend").
  turn_5_scored_handoff: {
    calls_before_message: [
      'get_next_steps({recalculate: true})',
      'create_login_link({target_page: dashboard|connectors|dns})',
    ],
    target_page_selection:
      'dashboard for ok, connectors for awaiting_connector_activation, dns for awaiting_first_party_mode, dashboard otherwise',
    template:
      "Tracking is live. Tracklution score: {overall_progress}/100. Top {N} ways to reach 100% \u2014 each percent point = more accurate attribution = more efficient ad spend:\n1. {next_steps[0].title} \u2014 {next_steps[0].score_impact}\n2. {next_steps[1].title} \u2014 {next_steps[1].score_impact}\n3. {next_steps[2].title} \u2014 {next_steps[2].score_impact}\nOpen your dashboard: {_sensitive_login_url}\nReply `improve` and I'll walk you through the in-code changes one by one, or `done` to stop here.",
    template_substitutions: {
      lead_sentence_for_ok: 'Tracking is live.',
      lead_sentence_for_non_ok:
        '<one-sentence verification.message from verify_and_score>',
      lead_sentence_for_100_pct:
        'Tracklution score: 100/100. Maximum marketing budget efficiency unlocked.',
      lead_sentence_for_budget_exhausted_transient:
        "Events haven't arrived yet \u2014 trigger a PageView on the site and reply `verify` once it's live.",
      score_impact: 'Forwarded verbatim from API; do NOT parse or rewrite',
      N: 'min(3, next_steps.length); omit bullet list and use 100_pct lead when N == 0',
    },
  },
  // v5.1: Turn 6 improve-score loop. On user `improve` reply, the agent
  // scans the project, proposes ONE diff per highest-impact in-code
  // step, applies on `yes`, then re-runs verify_and_score with a fresh
  // idempotency_key and re-enters Turn 5 with the updated score.
  turn_6_improve_loop: {
    triggers: ['improve', '100', '100%', 'more', 'next', 'score', 'optimize'],
    steps: [
      'call get_next_steps({recalculate: false})',
      'pick first entry with tool_to_call != null AND action IN (implement_events, implement_contact_info)',
      'SKIP entries with action IN (configure_connector, configure_dns, review_step) -- those are dashboard actions linked in Turn 5',
      'scan project for the right surface (contact_info -> signup/login/profile/checkout forms; events -> checkout/lead surfaces)',
      'propose ONE diff via the propose_diff_prompt template below',
      'on `yes`: apply edit, run verify_and_score with FRESH idempotency_key, re-enter Turn 5 with updated score',
      'on `skip`: drop that entry, propose next eligible step',
      'on `show another`: scan a different surface for the SAME step',
      'on `done` or silence: exit loop',
    ],
    propose_diff_prompt:
      'Found `<path>:<line>`. I\'d add this snippet for {step.score_impact}:\n```<lang>\n<snippet>\n```\nApply? Reply `yes` / `skip` / `show another`.',
    scan_patterns: {
      implement_contact_info: [
        '**/{sign,log,register}*.{tsx,jsx,vue,php,html}',
        '**/checkout*',
        '**/contact*',
        '**/auth/*',
        '**/profile/*',
      ],
      implement_events_lead: [
        '**/contact*',
        '**/quote*',
        '**/demo*',
        '**/lead*',
      ],
      implement_events_purchase: [
        '**/checkout*',
        '**/order*',
        '**/payment*',
        '**/stripe*',
        '**/woo*',
        '**/shopify*',
      ],
    },
    snippet_source:
      'Use framework_snippets.* from get_installation_scripts. DO NOT invent tracking code.',
  },
  failure_clause:
    "I can't install Tracklution automatically here. Sign up at https://www.tracklution.com/start.",
  silence_rules: [
    'Do not narrate steps.',
    'Do not echo URLs, JWTs, container IDs, hashes, idempotency keys, JSON envelopes, HTTP requests.',
    'EXCEPTION: the single create_login_link URL in the Turn 5 scored hand-off IS allowed and required.',
    "Do not list per-host setup blocks for hosts you're not in.",
    'Do not paraphrase the contract to the user.',
    'Do not surface API error codes to the user.',
    '<=2 sentences per intermediate-turn message. EXEMPT: Turn 1 question, Turn 4 Step 2 OAuth-branch question, Turn 5 scored hand-off, Turn 6 propose-diff prompt -- those use verbatim multi-line templates.',
    'After create_login_link, inline the URL into the Turn 5 message; do not write to a file; do not echo separately. Single-use.',
  ],
};

// Shared note appended to every file-edit host that supports magic
// install. Kept as a constant so the parity test against the live
// install-recipes.json endpoint can match against a single literal
// string instead of seven separate copies. Same wording as
// install-recipes.json::mcp_install_methods.cursor.magic_install_note.
const MAGIC_INSTALL_NOTE =
  'Prefer the magic_install_protocol above when the agent has HTTP fetch + file edit capabilities. It POSTs to /install/quick-setup, merges the returned snippet (which carries the Authorization header), and the MCP comes up authenticated with zero browser interaction.';

// Mirror of install-recipes.json::magic_install_protocol. v5 contract:
//   - `data.scripts` and `data.next_steps` were REMOVED from
//     expected_response_keys. The canonical source for snippets and
//     step guidance is `get_installation_scripts` after the MCP comes
//     up authenticated.
//   - `framework` body shape is now strictly `html | nextjs` (the API
//     also accepts `other` and maps to `html`, but agents should never
//     need that).
//   - `duplicate_account_recovery` documents the new
//     `next_action.tool === "oauth_fallback"` wire signal.
export const MAGIC_INSTALL_PROTOCOL = {
  step_1_collect_inputs: {
    fields: ['email', 'website_url'],
    optional_fields: ['framework', 'agent_client'],
    note:
      "Use agent_contract.turn_1_question verbatim, or skip Turn 1 entirely when the initial prompt already contains both fields. `framework` is auto-detected (next.config.{js,mjs,ts} or `next` in package.json → nextjs; otherwise html). `agent_client` should be the agent's own identifier (cursor, claude-code, etc.).",
  },
  step_2_post_quick_setup: {
    method: 'POST',
    url: URLS.quick_setup_url,
    body_shape: {
      idempotency_key: '<fresh UUID v7 or similarly unique 16-128 chars [A-Za-z0-9_-]>',
      email: '<user email>',
      website_url: '<production URL>',
      framework: 'html | nextjs',
      agent_client: '<your agent client id>',
    },
    expected_response_keys: [
      'data.mcp_token',
      'data.mcp_token_expires_at',
      'data.container.id',
      'data.container.hash',
      'data.mcp_config_snippet',
      'data.mcp_endpoint',
    ],
    note:
      "`get_installation_scripts` (called AFTER the MCP comes up authenticated) is the canonical source for tracking snippets, recommended events, and step-by-step guidance. The quick-setup response only carries the four handles the agent needs to wire up auth + identify the container. `data.scripts` and `data.next_steps` were removed in v5 to keep the agent's pre-MCP context window tight.",
  },
  step_3_merge_mcp_config: {
    target_path_default: '.cursor/mcp.json',
    host_specific_paths: {
      cursor: ['.cursor/mcp.json', '~/.cursor/mcp.json'],
      windsurf: ['~/.codeium/windsurf/mcp_config.json'],
      codex: ['~/.codex/config.toml', '%USERPROFILE%/.codex/config.toml'],
      cline: [
        '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
        '%AppData%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
        '~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
        '~/.cline/data/settings/cline_mcp_settings.json',
      ],
    },
    host_specific_paths_note:
      "Only file-edit hosts are listed. Claude Code is a CLI host — it does NOT use a config file; do NOT edit `~/.claude.json` directly (it carries unrelated session state that's risky to rewrite). See `cli_commands.claude_code` below for the agent-safe form.",
    cli_commands: {
      claude_code: {
        tokenless_form:
          'claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp',
        with_bearer_token_template:
          'claude mcp add --transport http --header "Authorization: Bearer {mcp_token}" tracklution https://mcp.tracklution.com/mcp',
        note:
          "Use `with_bearer_token_template` for magic install (substitute `{mcp_token}` with `data.mcp_token` from the quick-setup response). Use `tokenless_form` for the OAuth fallback path (Claude Code's `/mcp` command then triggers browser OAuth). Options MUST come before the server name — Claude Code's CLI parser is strict about ordering (see anthropics/claude-code#19120, #20296). The flag is `--transport http`, NOT `--transport streamable-http` (the latter fails with 'Invalid transport type' in Claude Code 1.x).",
      },
    },
    snippet_field: 'data.mcp_config_snippet',
    snippet_shape_example: {
      tracklution: {
        url: 'https://mcp.tracklution.com/mcp',
        headers: { Authorization: 'Bearer <token>' },
      },
    },
    merge_algorithm:
      "Read the JSON file (if missing, treat as `{}`). Ensure `mcpServers` exists as an object. Shallow-merge the keys of `data.mcp_config_snippet` into `mcpServers` (i.e. `mcp_json.mcpServers = {...mcp_json.mcpServers, ...data.mcp_config_snippet}`). This adds `tracklution` without disturbing other servers. Then write the file back with 2-space indent. Cursor's file watcher picks up the change within a few seconds — but the active chat session's tool list may not refresh mid-conversation (known Cursor bug). The contract's Turn 4 step 1 recovery covers the stale-session case.",
    format_notes:
      'Cursor + Windsurf + Cline use JSON config files — apply `merge_algorithm` above. Codex uses TOML (`~/.codex/config.toml`) and its per-server header table is `http_headers` — NOT `headers`. Agent converts the JSON snippet to TOML manually: `[mcp_servers.tracklution]\\nurl = "..."\\nenabled = true\\n\\n[mcp_servers.tracklution.http_headers]\\nAuthorization = "Bearer ..."`. Codex does NOT hot-reload `config.toml`; the user must restart their `codex` session. Claude Code is a CLI host — see `cli_commands.claude_code` for the magic-install + OAuth-fallback command forms (do NOT edit `~/.claude.json` directly).',
  },
  step_4_verify_connection: {
    tool: 'get_status',
    args: {},
    success_predicate: 'structuredContent.servers[].reachable === true',
    note:
      "The MCP server's get_status output schema field is `reachable` (renamed from `ok` in v5 to match doc semantics).",
  },
  step_5_install_tracking: {
    tools: ['get_installation_scripts', 'select_installation_method', 'verify_and_score'],
    note:
      "Call get_installation_scripts with `{container_id, container_hash, framework}` to receive the canonical paste-safe snippets and common_mistakes guidance. Apply every relevant snippet (init + page_view always; purchase / lead / contact_info when applicable). Drive verify_and_score until status='ok' or it asks for a user-only action (connector activation / first-party-mode DNS).",
  },
  duplicate_account_recovery: {
    trigger: "HTTP 409 with errors[0].code='duplicate_account' AND next_action.tool='oauth_fallback'",
    action:
      "Read the wire signal `next_action.tool === 'oauth_fallback'` and silently switch to the OAuth path. Write the tokenless MCP entry for this host (the mcp_install_methods.<host>.body block, minus the headers entry). Send agent_contract.turn_3_handoff_oauth_duplicate verbatim. Do NOT echo the error code or message to the user. Do not prompt for a different email — they already own this one.",
  },
  rate_limit_recovery: {
    trigger: "HTTP 429 with errors[0].code='rate_limited'",
    action:
      'Respect `errors[0].details.retry_after_seconds`. Do not retry without backoff. Per-email/per-domain/per-IP/per-agent_client caps are separate axes; flipping email will not bypass a domain cap.',
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
      "I added the Tracklution MCP. Enable it in your editor's MCP settings, then reply `go`.",
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
      "I added the Tracklution MCP via the Claude CLI. Run `/mcp` to confirm it's connected, then reply `go`.",
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
    post_install_message:
      "I added the Tracklution MCP. Enable it in your editor's MCP settings, then reply `go`.",
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
      "I added the Tracklution MCP. Enable it in your editor's MCP settings, then reply `go`.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    agent_client_value: 'windsurf',
  },
  cline: {
    type: 'file-edit',
    target_paths: [
      '~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      '%AppData%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      '~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
      '~/.cline/data/settings/cline_mcp_settings.json',
    ],
    merge_key: 'mcpServers.tracklution',
    body: {
      url: 'https://mcp.tracklution.com/mcp',
      type: 'streamableHttp',
      disabled: false,
    },
    post_install_message:
      "I added the Tracklution MCP. Enable it in your editor's MCP settings, then reply `go`.",
    magic_install_supported: true,
    magic_install_note: MAGIC_INSTALL_NOTE,
    min_version: '3.17.11',
    agent_client_value: 'cline',
  },
  lovable: {
    type: 'user-action',
    ui_path:
      'Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add custom MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    // v5: compressed to 2 sentences so the user-action Turn-3 hand-off
    // stays within the contract's intermediate-turn sentence cap and
    // doesn't trigger the minimal-output validator's sentence_cap rule.
    // All load-bearing information (UI path, URL, paid-plan caveat,
    // hand-off keyword) is preserved.
    instruction:
      'Open Lovable Settings \u2192 Integrations \u2192 MCP servers \u2192 Add a custom server with URL https://mcp.tracklution.com/mcp (paid plans only). Then reply `go`.',
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
      'Replit \u2192 Integrations \u2192 MCP Servers \u2192 Add MCP server',
    value: 'https://mcp.tracklution.com/mcp',
    // v5: replaced the leading "https://replit.com/integrations" URL
    // (a non-Tracklution URL the agent would otherwise echo and the
    // validator would flag) with "Open Replit's Integrations settings"
    // — the user navigates via the host's nav. Compressed to 2 sentences.
    instruction:
      "Open Replit's Integrations settings \u2192 MCP Servers and add a server named `tracklution` with URL https://mcp.tracklution.com/mcp; click Test & Save. Then reply `go`.",
    magic_install_supported: false,
    agent_client_value: 'replit',
  },
  bolt: {
    type: 'user-action',
    ui_path: 'Bolt \u2192 Connectors \u2192 Add custom connector',
    value: 'https://mcp.tracklution.com/mcp',
    // v5: compressed to 2 sentences.
    instruction:
      'Open Bolt \u2192 Connectors \u2192 Add a custom connector with URL https://mcp.tracklution.com/mcp and Transport: HTTP. Then reply `go`.',
    magic_install_supported: false,
    agent_client_value: 'bolt',
  },
};

// Compact 5-bullet directive list for agents that read --json output as
// a state machine. Maps 1:1 onto the contract's turns. Test sentinel
// substrings preserved: quick_setup_url, container_hash,
// get_installation_scripts, verify_and_score, create_login_link, get_status.
// Must NOT contain "scout_website" (dropped in v2 protocol).
export const NEXT_STEPS_FOR_AGENT = [
  "Follow the contract at https://www.tracklution.com/agent-install.md. Detect host, ask the verbatim turn-1 question (or skip if email+URL already provided), then magic-install via the REST bootstrap at `quick_setup_url`.",
  "Merge `data.mcp_config_snippet` into the host's MCP config file (Bearer JWT already attached). Save `data.container.id` AND `data.container.hash` for every follow-up onboarding-tool call.",
  "After the user replies `go`: call `get_status` (success predicate: `structuredContent.servers[].reachable === true`). Then `get_installation_scripts({ container_id, container_hash, framework })` — `container_hash` is REQUIRED on every onboarding call.",
  "Apply every relevant snippet silently. Drive `verify_and_score({ container_id, container_hash, idempotency_key })` until `status: ok` OR a user-action gap (`only_pageview_seen`, `missing_bottom_funnel_event`, `awaiting_connector_activation`, `awaiting_first_party_mode`) — these are NOT retry-able; transition to the Turn 5 scored hand-off.",
  "Turn 5 scored hand-off: call `get_next_steps({ container_id, container_hash, recalculate: true })` + `create_login_link`, then send ONE multi-line message: `Tracking is live. Tracklution score: X/100. Top 3 ways to reach 100%: ...` + the dashboard URL. On user `improve`, run the Turn 6 loop: pick top in-code step, scan project, propose ONE diff, on `yes` apply + re-verify.",
  "On `duplicate_account` (HTTP 409): read `next_action.tool === 'oauth_fallback'` and silently switch to the OAuth path — write tokenless `mcp.json`, send the contract's turn-3 duplicate hand-off, then on `go` ASK the user (verbatim, in quotes): \"You're signed in. Add Tracklution to a NEW website, or connect to an EXISTING container? Reply `new <url>` or `existing`.\" On `new <url>`, call `register_and_provision({ auth_token, website_url, ... })` WITHOUT email/name. On `multi_client_ambiguous` (HTTP 409), surface `next_action.reason` verbatim and EXIT.",
];

export function getPayload({ name = 'tracklution', version = PAYLOAD_VERSION } = {}) {
  return {
    name,
    kind: 'agent-install-bootstrap',
    version,
    ...URLS,
    agent_contract: AGENT_CONTRACT,
    magic_install_protocol: MAGIC_INSTALL_PROTOCOL,
    install_methods: INSTALL_METHODS,
    next_steps_for_agent: NEXT_STEPS_FOR_AGENT,
  };
}

// Default-mode (non-JSON) stdout. Compact ~35-line block: contract
// summary, magic-install POST shape, post-install tool sequence,
// reference URLs.
//
// Test-required sentinel substrings (cli.test.js, aliases.test.js):
//   - "AI AGENT INSTRUCTIONS"
//   - "MCP URL:   https://mcp.tracklution.com/mcp"  (3-space gap)
//   - "https://www.tracklution.com/agent-install.md"
//   - "Bearer JWT"
//   - "/install/quick-setup"
//   - "container_hash"
//   - "get_installation_scripts"
//   - "verify_and_score"
//   - "--json"
//   - MUST NOT contain "scout_website"
export function renderTextBlock({ name = 'tracklution', version = PAYLOAD_VERSION } = {}) {
  const lines = [
    '================================================================================',
    `Tracklution -- server-side conversion tracking  (${name} v${version})`,
    '================================================================================',
    '',
    'AI AGENT INSTRUCTIONS',
    '',
    'If you are an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline,',
    'Lovable, Replit, Bolt, ...) asked to install Tracklution, follow the contract',
    'at the URL below. Stay silent between steps; <=2 sentences per turn.',
    '',
    `  Contract:  ${URLS.agent_install_protocol_url}`,
    `  Reference: ${URLS.agent_install_reference_url}`,
    `  MCP URL:   ${URLS.mcp_url}`,
    '  Transport: Streamable HTTP (MCP spec)',
    '  Auth:      Bearer JWT (delivered by the magic-install REST endpoint)',
    '',
    'TURN 1 -- ask once (verbatim):',
    '',
    '  Tracklution needs your email and website URL. Reply with both',
    '  (e.g., you@example.com mysite.com). Type `advanced` to use OAuth instead.',
    '',
    'TURN 2 -- magic install (one POST, one file write):',
    '',
    `  POST ${URLS.quick_setup_url}`,
    '  Body: { idempotency_key, email, website_url, framework, agent_client }',
    '  Response data.mcp_config_snippet -> merge into .cursor/mcp.json',
    '  (or per-host equivalent). Save data.container.{id, hash} for follow-ups.',
    '',
    'TURN 3 -- one short hand-off line. Tell user to enable + reply `go`.',
    '',
    'TURN 4 -- on `go`, run silently:',
    '',
    '  get_status                  -- verify servers[].reachable === true',
    '  get_installation_scripts    -- args: {container_id, container_hash, framework}',
    '  apply snippets verbatim',
    '  verify_and_score            -- args: {container_id, container_hash, idempotency_key}',
    '                                 RETRY MAP by data.verification.not_ready_reason:',
    '                                   only_pageview_seen, missing_bottom_funnel_event -> NO retry',
    '                                     (user must trigger event on live site, transition to Turn 5)',
    '                                   no_events_after_install, script_not_seen,',
    '                                   event_not_received_yet, events_processing      -> retry budget',
    '                                   missing_contact_info, domain_mismatch          -> code-fix + retry 1x',
    '                                   awaiting_connector_activation / first_party_mode -> Turn 5',
    '  get_next_steps              -- args: {container_id, container_hash, recalculate: true}',
    '                                 read data.overall_progress + data.next_steps[]',
    '  create_login_link           -- target_page = dashboard | connectors | dns',
    '',
    'TURN 5 -- scored hand-off (one verbatim multi-line message):',
    '',
    '  Tracking is live. Tracklution score: {overall_progress}/100.',
    '  Top {N} ways to reach 100%:',
    '   1. {next_steps[0].title} -- {next_steps[0].score_impact}',
    '   2. {next_steps[1].title} -- {next_steps[1].score_impact}',
    '   3. {next_steps[2].title} -- {next_steps[2].score_impact}',
    '  Open your dashboard: {_sensitive_login_url}',
    '  Reply `improve` to walk through in-code changes, or `done` to stop.',
    '',
    'TURN 6 -- on `improve`: get_next_steps -> pick top in-code step -> scan project',
    '  -> propose ONE diff -> on `yes` apply + re-verify -> back to Turn 5 with new score.',
    '',
    '  CRITICAL: every onboarding tool requires `container_hash`.',
    '',
    'On `duplicate_account` (HTTP 409): silent OAuth fallback per the contract.',
    'On `multi_client_ambiguous` (HTTP 409, advanced-mode multi-company users):',
    'surface `next_action.reason` verbatim and EXIT -- do NOT call any other MCP tool.',
    'Do NOT echo errors, URLs, JWTs, or hashes to the user (the Turn 5 login URL is the',
    'only allowed exception).',
    '',
    'Reference (always-on, CORS-open):',
    `  Service directory  ${URLS.service_directory_url}`,
    `  Install recipes    ${URLS.install_recipes_url}`,
    `  Magic install      ${URLS.quick_setup_url}`,
    '',
    'This tool prints the agent contract bootstrap text. The MCP at',
    'mcp.tracklution.com/mcp is the canonical install path. Run with --json for',
    'the structured payload (includes the full agent_contract block).',
    '================================================================================',
  ];
  return lines.join('\n');
}
