# Examples

Five Pareto examples that cover ~90% of real installs. Each directory is
self-contained: a `README.md` for humans, an `AGENTS.md` for AI coding agents,
and the actual config / snippet files an agent would copy.

## AI agent client setup

| Client | Example | Install type |
|---|---|---|
| [Cursor](cursor/) | `.cursor/mcp.json` + deeplink | Auto (file-edit) |
| [Claude Code](claude-code/) | `claude mcp add ...` CLI command | Auto (CLI) |

The other auto-install clients (Codex CLI, Windsurf) and the user-action ones
(Lovable, Replit, Bolt) use the same patterns shown in these two examples — see
`tests/cli.test.js` `REQUIRED_HOSTS` for the full set, or fetch
`https://www.tracklution.com/api/install-recipes/` for the machine-readable
matrix.

Want to PR an example for a different client (Codex, Windsurf, Cline, Aider,
Continue, Zed)? Open a [Feature
Request](../.github/ISSUE_TEMPLATE/feature_request.yml) and we'll mark it as a
"good first issue".

## Framework integration

| Framework | Example | Description |
|---|---|---|
| [Next.js (App Router)](next-js-app-router/) | `app/layout.tsx` + `.cursor/mcp.json` | Pixel + custom events with `next/script` |
| [Shopify](shopify/) | `layout/theme.liquid` snippet | Storefront pixel + checkout server events |
| [Google Tag Manager](google-tag-manager/) | GTM Custom HTML tag | Universal escape hatch for any site |

## About the placeholder values

Every framework example uses `<TRACKLUTION_TAG_ID>` as a placeholder for the
per-account tracking tag ID the MCP server generates during onboarding. **Do
not commit a real tag ID into examples.** The MCP server's
`get_installation_scripts` tool returns the correct snippets with the real ID
baked in.

If you are an AI coding agent reading this and your user already has the MCP
configured, ignore these examples and call `get_installation_scripts` directly
— that's the canonical source for the snippet content.

## Layout convention

```
examples/<client-or-framework>/
  README.md               # human-readable explanation + manual setup steps
  AGENTS.md               # short instructions for an AI agent landing here
  <config files>          # .cursor/mcp.json, .claude-code/, theme.liquid, etc.
```

If you add a new example, follow the same layout. Keep snippets short and
clearly marked as templates with the `<TRACKLUTION_TAG_ID>` placeholder.
