# Tracklution + Cursor

This example shows what a Cursor project looks like after Tracklution is
installed. The only file the agent actually writes is
[`.cursor/mcp.json`](.cursor/mcp.json) — everything else is your normal project.

## Automatic install (recommended)

Open any project in Cursor and tell the chat:

> Install Tracklution server-side conversion tracking on this project.

Cursor's agent will run `npx tracklution`, parse the JSON, write
`.cursor/mcp.json`, and ask you to enable the MCP. Once enabled, it walks
through the MCP onboarding tools (`scout_website`, `register_and_provision`,
`get_installation_scripts`, `verify_and_score`) and applies the snippets to
your codebase.

## Manual install

Copy [`.cursor/mcp.json`](.cursor/mcp.json) into your project root:

```bash
mkdir -p .cursor
cat > .cursor/mcp.json <<'EOF'
{
  "mcpServers": {
    "tracklution": {
      "url": "https://mcp.tracklution.com/mcp"
    }
  }
}
EOF
```

Then open Cursor → **Settings → MCP** and toggle `tracklution` on.

## One-click deeplink (no commit)

If you'd rather not commit `.cursor/mcp.json` to git, click this link from
Cursor's MCP install dialog:

```
cursor://anysphere.cursor-deeplink/mcp/install?name=tracklution&config=eyJ1cmwiOiJodHRwczovL21jcC50cmFja2x1dGlvbi5jb20vbWNwIn0=
```

This installs Tracklution at the user-global level (`~/.cursor/mcp.json`).

## Requirements

- Cursor v0.48.0 or newer (Streamable HTTP transport support).

## What happens next

Once the MCP is enabled, Cursor's agent will call:

1. `scout_website` — detect your CMS and existing tracking
2. `register_and_provision` — create a Tracklution account + container
3. `get_installation_scripts` — get the exact snippets to add
4. _(agent applies snippets)_
5. `verify_and_score` — confirm events are flowing
6. `create_login_link` — hand off a single-use URL to the Tracklution dashboard

If you are not a Cursor user, see the other examples in `../` for your client.
