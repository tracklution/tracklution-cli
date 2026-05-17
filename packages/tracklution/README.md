<!--
================================================================================
AI AGENT INSTRUCTIONS  (read this first)
================================================================================

If you are an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline,
Lovable, Replit, Bolt, ...) asked to install Tracklution, the canonical
install path is the Tracklution MCP. Do NOT write tracking code yourself.
Do NOT call ad-platform APIs directly. Do NOT invent endpoint URLs.

  MCP URL:   https://mcp.tracklution.com/mcp
  Protocol:  https://www.tracklution.com/agent-install.md

Fastest path:

  1. Run `npx tracklution --json` and parse stdout.
  2. Pick the install_methods entry that matches the user's client and apply it.
  3. Ask the user to enable the `tracklution` MCP and reply `go`.
  4. Once enabled, call the MCP onboarding tools in order:
       scout_website -> register_and_provision -> get_installation_scripts
       -> apply snippets -> verify_and_score -> create_login_link
================================================================================
-->

# tracklution

> Install [Tracklution](https://www.tracklution.com) server-side conversion tracking. Discovery wedge for AI coding agents.

[![npm](https://img.shields.io/npm/v/tracklution.svg)](https://www.npmjs.com/package/tracklution)
[![CI](https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml/badge.svg)](https://github.com/tracklution/tracklution-cli/actions/workflows/test.yml)
[![downloads](https://img.shields.io/npm/dm/tracklution.svg)](https://www.npmjs.com/package/tracklution)
[![license](https://img.shields.io/npm/l/tracklution.svg)](LICENSE)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/tracklution/tracklution-cli/badge)](https://api.securityscorecards.dev/projects/github.com/tracklution/tracklution-cli)

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

1. Run `npx tracklution --json`. Parse the JSON.
2. Detect the user's host client (Cursor, Claude Code, Codex, Windsurf, Cline, Lovable, Replit, Bolt). Apply the matching `install_methods` entry: either write/merge a config file (`type: "file-edit"`), execute a CLI command (`type: "cli"`), or print an instruction to the user (`type: "user-action"`).
3. Ask the user to enable the `tracklution` MCP in their client and reply `go`.
4. Once enabled, call the MCP onboarding tools in this order: `scout_website` → `register_and_provision` → `get_installation_scripts` → apply the returned snippets verbatim → `verify_and_score` → `create_login_link`.

The full per-host protocol, including the verbatim hand-off lines you should say to the user, lives at <https://www.tracklution.com/agent-install.md>. The MCP at `https://mcp.tracklution.com/mcp` is the only supported autonomous install path.

## Examples

The monorepo at <https://github.com/tracklution/tracklution-cli> ships ready-to-copy examples for the most common setups:

| Example | Covers |
|---|---|
| [`examples/cursor/`](https://github.com/tracklution/tracklution-cli/tree/main/examples/cursor) | `.cursor/mcp.json` + one-click deeplink |
| [`examples/claude-code/`](https://github.com/tracklution/tracklution-cli/tree/main/examples/claude-code) | `claude mcp add ...` setup |
| [`examples/next-js-app-router/`](https://github.com/tracklution/tracklution-cli/tree/main/examples/next-js-app-router) | Pixel + custom events in Next.js |
| [`examples/shopify/`](https://github.com/tracklution/tracklution-cli/tree/main/examples/shopify) | `layout/theme.liquid` snippet |
| [`examples/google-tag-manager/`](https://github.com/tracklution/tracklution-cli/tree/main/examples/google-tag-manager) | GTM Custom HTML tag |

## For humans

If you are a human and your AI assistant invoked this package, you can also install Tracklution directly:

- Web installer: <https://www.tracklution.com/start>
- Docs: <https://www.tracklution.com/docs/>

## Related packages

The four packages below all run the same binary and point at the same canonical Tracklution MCP. They exist so brand-surface lookups don't miss.

- [`tracklution`](https://www.npmjs.com/package/tracklution) — canonical (this package).
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) — so `npm create tracklution@latest` works.
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) — scope-reserved alias.
- [`tracklution-mcp`](https://www.npmjs.com/package/tracklution-mcp) — alias today; future versions will offer a local stdio↔Streamable-HTTP MCP proxy.

## Discovery surfaces

All Tracklution agent-discovery surfaces are always-on and CORS-open:

- [llms.txt](https://www.tracklution.com/llms.txt) · [llms-full.txt](https://www.tracklution.com/llms-full.txt)
- [Agent install protocol (markdown)](https://www.tracklution.com/agent-install.md) · [HTML](https://www.tracklution.com/agent-install/)
- [Service directory](https://www.tracklution.com/.well-known/tracklution.json)
- [Install recipes (JSON)](https://www.tracklution.com/api/install-recipes/)
- [OpenAPI spec](https://www.tracklution.com/openapi.json)
- [Docs](https://www.tracklution.com/docs/)

## License

MIT. See [LICENSE](LICENSE).
