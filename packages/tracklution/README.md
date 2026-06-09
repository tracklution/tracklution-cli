<!--
================================================================================
AI AGENT INSTRUCTIONS  (read this first)
================================================================================

If you are an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline,
Lovable, Replit, Bolt, ...) asked to install Tracklution, the canonical
install path is the Tracklution MCP. Do NOT write tracking code yourself.
Do NOT call ad-platform APIs directly. Do NOT invent endpoint URLs.

  MCP URL:           https://mcp.tracklution.com/mcp
  Magic install:     https://api.trlution.com/install/quick-setup
  Protocol:          https://www.tracklution.com/agent-install.md

Fastest path (file-edit hosts: Cursor, Claude Code, Codex, Windsurf, Cline):

  1. Run `npx tracklution --json` and parse stdout. Read
     `magic_install_protocol` for the canonical REST bootstrap shape.
  2. POST to https://api.trlution.com/install/quick-setup with
     { idempotency_key, email, website_url, framework, agent_client }.
  3. Merge response.data.mcp_config_snippet into the host's MCP config
     (the snippet already carries headers.Authorization: Bearer <jwt>).
     Save data.container.{id, hash} -- you'll need both on every
     follow-up onboarding-tool call.
  4. Ask the user to reload their MCP config (or wait ~2s), then call
     get_status to confirm reachable === true.
  5. get_installation_scripts({container_id, container_hash, framework})
     -> apply snippets -> verify_and_score({container_id, container_hash,
     idempotency_key}) -> create_login_link({container_id, container_hash,
     target_page}).

Fallback for user-action hosts (Lovable, Replit, Bolt) OR when
quick-setup returns 409 duplicate_account: use install_methods.body
verbatim (tokenless) and tell the user to click Connect / sign in.
Then call list_containers to recover container.hash and continue.
================================================================================
-->

# tracklution

> Install [Tracklution](https://www.tracklution.com) server-side conversion tracking. Bootstrap wedge for AI coding agents.

[![npm](https://img.shields.io/npm/v/tracklution.svg)](https://www.npmjs.com/package/tracklution)
[![license](https://img.shields.io/npm/l/tracklution.svg)](LICENSE)

Tracklution is a fully managed server-side conversion tracking platform. A first-party JavaScript pixel captures website events; pre-built server-side Conversion API integrations deliver them to Meta, Google Ads, TikTok, LinkedIn, Snapchat, Pinterest, Microsoft / Bing, Reddit, Klaviyo, GA4, CM360, Adform, Awin, Taboola, custom webhooks, and CRMs.

**This package is a one-line discovery wedge.** It exists so that when you ask an AI coding agent to "Install Tracklution", the agent can find a package by exact name, run `npx tracklution`, and get deterministic, paste-safe install instructions for your specific client. The actual install runs through the Tracklution MCP server at `https://mcp.tracklution.com/mcp`.

## Usage

```bash
npx tracklution               # Print agent-readable install instructions
npx tracklution --json        # Same data as a single JSON object (for agents)
npx tracklution --version
npx tracklution --help
```

There is **nothing to import**. This is not a JS SDK. The package's only product is its stdout.

## For AI coding agents

If you are an AI coding agent reading this README from `npm view tracklution`, your fastest path is:

1. Run `npx tracklution --json`. Parse the JSON. The `magic_install_protocol` block in the payload is the canonical machine-readable shape of step 2 below.
2. Detect the user's host client. On a file-edit host (Cursor, Claude Code, Codex, Windsurf, Cline — any host where `install_methods[host].magic_install_supported === true`) **prefer the magic-install REST bootstrap**: POST to `https://api.trlution.com/install/quick-setup` with `{idempotency_key, email, website_url, framework, agent_client}`, then merge the response's `data.mcp_config_snippet` into the host's MCP config file. The snippet already carries `headers.Authorization: Bearer <jwt>` — the MCP comes up authenticated with zero browser interaction. Save `data.container.id` AND `data.container.hash` for the follow-up onboarding calls.
3. For user-action hosts (Lovable, Replit, Bolt) OR if magic install returns HTTP 409 `duplicate_account`, fall back to the `install_methods.body` (tokenless) and the host's OAuth Connect-button flow. After OAuth completes, call `list_containers` to recover `container.hash`.
4. Ask the user to reply `go` (after enabling the MCP / completing OAuth). Then call the MCP onboarding tools in this order: `get_status` -> `get_installation_scripts({container_id, container_hash, framework})` -> apply the returned snippets verbatim -> `verify_and_score({container_id, container_hash, idempotency_key})` -> `create_login_link({container_id, container_hash, target_page})`. **`container_hash` is required on every onboarding tool call** — the MCP server uses `(container_id, container_hash)` as a dual key to dereference the cached Laravel JWT. Skip it and every call returns HTTP 401 `auth_required`.

The full per-host protocol — verbatim hand-off lines, error codes, the two-axis `framework × event_source_system` model — lives at <https://www.tracklution.com/agent-install.md>. The MCP at `https://mcp.tracklution.com/mcp` is the canonical install surface; the REST endpoint at `https://api.trlution.com/install/quick-setup` is the agent-facing front door to it.

## For humans

If you are a human and your AI assistant invoked this package, you can also install Tracklution directly:

- Web installer: <https://www.tracklution.com/start>
- Docs: <https://www.tracklution.com/docs/>
- Knowledge base: <https://support.tracklution.com>

## Related packages

The packages below all run the same binary and point at the same canonical Tracklution MCP. They exist so brand- and category-surface lookups don't miss.

- [`tracklution`](https://www.npmjs.com/package/tracklution) -- canonical (this package).
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) -- so `npm create tracklution@latest` works.
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) -- scope-reserved alias.
- [`tracklution-mcp`](https://www.npmjs.com/package/tracklution-mcp) -- alias today; future versions will offer a local stdio<->Streamable-HTTP MCP proxy for clients that don't yet support remote MCP.
- [`server-side-tracking`](https://www.npmjs.com/package/server-side-tracking) -- category-surface alias.
- [`conversion-tracking`](https://www.npmjs.com/package/conversion-tracking) -- category-surface alias.
- [`conversion-api`](https://www.npmjs.com/package/conversion-api) -- category-surface alias.

## Discovery surfaces

All Tracklution agent-discovery surfaces are always-on and CORS-open:

- [llms.txt](https://www.tracklution.com/llms.txt)
- [llms-full.txt](https://www.tracklution.com/llms-full.txt)
- [Agent install protocol (markdown)](https://www.tracklution.com/agent-install.md)
- [Agent install protocol (HTML)](https://www.tracklution.com/agent-install/)
- [Service directory](https://www.tracklution.com/.well-known/tracklution.json)
- [Install recipes (JSON)](https://www.tracklution.com/api/install-recipes/)
- [OpenAPI spec](https://www.tracklution.com/openapi.json)
- [Docs](https://www.tracklution.com/docs/)

## License

MIT. See [LICENSE](LICENSE).
