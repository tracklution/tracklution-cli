# tracklution-mcp

> Discovery wedge for the [Tracklution](https://www.tracklution.com) MCP server at `https://mcp.tracklution.com/mcp`.

[![npm](https://img.shields.io/npm/v/tracklution-mcp.svg)](https://www.npmjs.com/package/tracklution-mcp)
[![CI](https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml/badge.svg)](https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml)
[![license](https://img.shields.io/npm/l/tracklution-mcp.svg)](LICENSE)

## v1.x — alias shim

**Today, this package is an alias of the [`tracklution`](https://www.npmjs.com/package/tracklution) package.** Its `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

```bash
npx tracklution-mcp
```

Prints the Tracklution agent install protocol to stdout. AI coding agents should:

1. Add an MCP server entry to their client pointing at `https://mcp.tracklution.com/mcp` (the canonical remote endpoint).
2. Ask the user to enable the `tracklution` MCP.
3. Call the MCP onboarding tools (`scout_website`, `register_and_provision`, `get_installation_scripts`, `verify_and_score`, `create_login_link`).

## What the MCP server exposes

The Tracklution MCP server at `https://mcp.tracklution.com/mcp` is a [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-11-25/) MCP server. It runs in **two modes** on a single endpoint:

### Public mode (onboarding, no auth)

| Tool | Purpose |
|---|---|
| `scout_website` | Detect CMS / existing tracking on the user's URL. Returns an onboarding-session ID. |
| `register_and_provision` | Create a Tracklution account + container. Returns a 60-minute JWT. |
| `get_installation_scripts` | Paste-safe snippets keyed by framework (`html`, `nextjs`) + webhook templates. |
| `select_installation_method` | Mutate the container's installation method (`manual`, `gtm`, `shopify`, `woocommerce`, ...). |
| `verify_and_score` | Force-process events, return a strict diagnosis with a stable `not_ready_reason` enum. |
| `get_next_steps` | Scoring-driven ordered guidance. |
| `get_onboarding_session` | Replayable session transcript. |
| `create_login_link` | Single-use dashboard handoff URL. |
| `request_analytics_access` | When the user asks for stats in public mode, returns a `needs_action: user_authenticates_mcp` envelope pointing at OAuth. |

### Authenticated mode (analytics + reporting, OAuth 2.1 + PKCE)

| Tool | Purpose |
|---|---|
| `get_status` | Per-container health / event counts. |
| `get_api_key_info` | Inspect the agent's bound API key. |
| `list_containers` | All containers visible to the authenticated user. |
| `get_container` | One container's full record. |
| `get_summary` | Aggregated event / source / destination stats. |
| `get_report` | Custom-dimension report. |
| `list_events` | Recent events with rich filters (gclid / fbclid / ttclid / etc.). |
| `list_sessions` | Recent visitor sessions. |

The same analytics tool names exist in public mode as auth-bridge stubs that return a `needs_action: user_authenticates_mcp` envelope — your agent should surface that envelope's `user_instruction` to the user verbatim.

## v2.0 — planned local stdio proxy

**Planned for a future v2.0 major release**, `tracklution-mcp` will ship a real local stdio↔Streamable-HTTP MCP proxy:

```bash
# planned, not yet implemented
npx tracklution-mcp
```

…will run a local stdio MCP server that proxies every request to `https://mcp.tracklution.com/mcp`. This solves two real problems:

1. **Codex CLI** has documented issues initializing some Streamable HTTP MCP servers.
2. **Cline (CLI variant)** and some Claude Desktop builds still prefer stdio-launched MCP servers.

Roadmap and progress live on the public [tracklution-cli Roadmap](https://github.com/orgs/tracklution/projects) GitHub Project. **Treat the v2.0 plan as aspirational** — v1.x will remain a thin alias until v2.0 ships.

## Related packages

- [`tracklution`](https://www.npmjs.com/package/tracklution) — canonical (recommended for current installs)
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) — so `npm create tracklution@latest` works
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) — scope-reserved alias

## License

MIT. See [LICENSE](LICENSE).
