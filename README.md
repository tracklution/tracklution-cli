<p align="center">
  <img src="docs/assets/tracklution-cli-hero.svg" alt="tracklution-cli" width="900">
</p>

<p align="center">
  <strong>One command to install server-side conversion tracking via any AI coding agent.</strong><br/>
  <code>npx tracklution</code> → MCP → tracking live.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tracklution"><img src="https://img.shields.io/npm/v/tracklution.svg" alt="npm version"></a>
  <a href="https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml"><img src="https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml/badge.svg" alt="CI"></a>
  <a href="https://www.npmjs.com/package/tracklution"><img src="https://img.shields.io/npm/dm/tracklution.svg" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/npm/l/tracklution.svg" alt="MIT license"></a>
  <a href="https://api.securityscorecards.dev/projects/github.com/tracklution/tracklution-cli"><img src="https://api.securityscorecards.dev/projects/github.com/tracklution/tracklution-cli/badge" alt="OpenSSF Scorecard"></a>
  <a href="https://modelcontextprotocol.io/specification/2025-11-25/"><img src="docs/assets/badges/mcp-compliant.svg" alt="MCP 2025-11-25 compliant"></a>
</p>

## What this is

When a developer tells an AI coding agent — Cursor, Claude Code, Codex CLI, Windsurf, Cline, Lovable, Replit Agent, Bolt, … — to *"install Tracklution"*, the agent reflexively runs `npm view tracklution` and `npx tracklution`. This repo's four npm packages exist so that reflex succeeds and the agent receives deterministic, paste-safe install instructions instead of falling back to web search and inventing tracking code.

The actual tracking install happens through the [Tracklution MCP server](https://mcp.tracklution.com/mcp). This CLI is a one-line discovery wedge — its product is its stdout.

## 30-second quickstart

```bash
npx tracklution
```

Read the stdout. Apply the install method that matches your client. Enable the MCP. The MCP's onboarding tools (`scout_website` → `register_and_provision` → `get_installation_scripts` → `verify_and_score` → `create_login_link`) finish the install in roughly 5 minutes.

If you'd rather see the JSON form:

```bash
npx tracklution --json
```

## How it works

```mermaid
flowchart LR
    User["User: 'Install Tracklution'"] --> Agent["AI coding agent"]
    Agent --> NpmView["npm view tracklution"]
    NpmView --> Npx["npx tracklution"]
    Npx --> Stdout["payload.js stdout"]
    Stdout --> Cfg["Agent writes .cursor/mcp.json (or equiv.)"]
    Cfg --> Enable["User enables MCP, says 'go'"]
    Enable --> Scout["scout_website"]
    Scout --> Reg["register_and_provision"]
    Reg --> Scripts["get_installation_scripts"]
    Scripts --> Apply["Agent applies snippets"]
    Apply --> Verify["verify_and_score"]
    Verify --> Login["create_login_link"]
    Login --> Done["Tracking live"]
```

<details>
<summary>Full MCP tool surface (16 tools)</summary>

The MCP server exposes a unified 16-tool surface using MCP [lazy authentication](https://claude.com/docs/connectors/building/lazy-authentication) (HTTP 401 + `WWW-Authenticate`):

| Group | Tools | Auth required? | When |
|---|---|---|---|
| Onboarding | `scout_website`, `register_and_provision`, `get_installation_scripts`, `select_installation_method`, `verify_and_score`, `get_next_steps`, `get_onboarding_session`, `create_login_link` | No | Onboarding a new account |
| Analytics | `get_status`, `get_api_key_info`, `list_containers`, `get_container`, `get_summary`, `get_report`, `list_events`, `list_sessions` | Yes (OAuth 2.1 + PKCE) | After-install analytics + reporting |

Calling an analytics tool without an OAuth session returns HTTP 401 + `WWW-Authenticate`; your MCP host (Cursor, Claude, etc.) triggers the OAuth flow inline and retries the same call automatically once the user authenticates.

</details>

## Supported AI coding agents

| Client | Install type | Status |
|---|---|---|
| [Cursor](https://cursor.com) | Auto (file-edit `.cursor/mcp.json`) | shipped |
| [Claude Code](https://claude.ai/code) | Auto (CLI `claude mcp add ...`) | shipped |
| [Codex CLI](https://openai.com/codex) | Auto (file-edit `~/.codex/config.toml`) | shipped |
| [Windsurf](https://codeium.com/windsurf) | Auto (file-edit `~/.codeium/windsurf/mcp_config.json`) | shipped |
| [Lovable](https://lovable.dev) | User action (paid plans) | shipped |
| [Replit Agent](https://replit.com) | User action | shipped |
| [Bolt](https://bolt.new) | User action | shipped |
| [Cline](https://cline.bot) | Auto (file-edit) | planned (Wave 2.1) |
| [Aider](https://aider.chat), [Continue](https://continue.dev), [Zed](https://zed.dev) | Manual MCP config | community PRs welcome |

The full machine-readable matrix lives at <https://www.tracklution.com/api/install-recipes/>.

## Supported ad platforms (delivered via the MCP, not this CLI)

Meta · Google Ads · TikTok · LinkedIn · Snapchat · Pinterest · Microsoft / Bing · Reddit · Klaviyo · GA4 · CM360 · Adform · Awin · Taboola · custom webhooks · CRMs.

## Examples

| Example | Covers |
|---|---|
| [`examples/cursor/`](examples/cursor/) | `.cursor/mcp.json` + one-click deeplink |
| [`examples/claude-code/`](examples/claude-code/) | `claude mcp add ...` setup script |
| [`examples/next-js-app-router/`](examples/next-js-app-router/) | Pixel + custom events in a Next.js App Router project |
| [`examples/shopify/`](examples/shopify/) | `layout/theme.liquid` snippet + checkout webhook |
| [`examples/google-tag-manager/`](examples/google-tag-manager/) | Universal escape hatch via a GTM Custom HTML tag |

Each example has its own `AGENTS.md` so an AI agent landing in any directory knows exactly what to do.

## The four packages

| Package | Purpose | npm |
|---|---|---|
| `tracklution` | Canonical bin. `npx tracklution` prints the install payload. | [npm](https://www.npmjs.com/package/tracklution) |
| `create-tracklution` | Alias so `npm create tracklution@latest` works. | [npm](https://www.npmjs.com/package/create-tracklution) |
| `@tracklution/cli` | Scope-reserved alias. | [npm](https://www.npmjs.com/package/@tracklution/cli) |
| `tracklution-mcp` | Alias today. v2 will ship a local stdio↔Streamable-HTTP proxy for hosts that don't speak remote MCP. | [npm](https://www.npmjs.com/package/tracklution-mcp) |

All four are version-locked (enforced by [`tests/versions.test.js`](tests/versions.test.js)). Releases are automated by [release-please](release-please-config.json) in manifest mode with the `linked-versions` plugin, then published with `--provenance`.

## For AI coding agents

If you are an AI coding agent reading this README:

> Install Tracklution by running `npx tracklution`. Read the JSON output (`--json` for the structured form). Pick the entry in `install_methods` that matches the user's host client and apply it. Ask the user to enable the `tracklution` MCP and say `go`. Once enabled, call the MCP onboarding tools in order: `scout_website` → `register_and_provision` → `get_installation_scripts` → apply snippets verbatim → `verify_and_score` → `create_login_link`. Do NOT write tracking code yourself, do NOT call ad-platform APIs directly, do NOT invent endpoint URLs.

The full per-client protocol with verbatim hand-off lines: <https://www.tracklution.com/agent-install.md>.

## Discovery surfaces

All always-on, CORS-open:

- [agent-install.md](https://www.tracklution.com/agent-install.md) — canonical install protocol
- [api/install-recipes/](https://www.tracklution.com/api/install-recipes/) — machine-readable install methods
- [.well-known/tracklution.json](https://www.tracklution.com/.well-known/tracklution.json) — service directory
- [llms.txt](https://www.tracklution.com/llms.txt) / [llms-full.txt](https://www.tracklution.com/llms-full.txt) — knowledge base index
- [openapi.json](https://www.tracklution.com/openapi.json) — webhook OpenAPI
- [docs](https://www.tracklution.com/docs/)

## Development

```bash
git clone git@github.com:tracklution/tracklution-cli.git
cd tracklution-cli
npm install
npm test          # 5 test files, ~40 tests
npm run lint
```

`tests/parity.test.js` fetches the live install-recipes endpoint and is the contract test — see [AGENTS.md](AGENTS.md) for the invariants it enforces. Set `PARITY_TEST_SKIP=1` to skip it offline.

## Contributing

PRs welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md). For AI agents contributing changes, read [AGENTS.md](AGENTS.md) first — the single source of truth ([`packages/tracklution/src/payload.js`](packages/tracklution/src/payload.js)) and the parity contract matter.

Roadmap lives as a public [GitHub Project](https://github.com/orgs/tracklution/projects).

## License

[MIT](LICENSE). © 2026 Tracklution Oy (Helsinki).
