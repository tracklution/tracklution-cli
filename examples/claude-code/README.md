# Tracklution + Claude Code

This example shows the single command that installs the Tracklution MCP in
Claude Code. No project files are written — Claude Code manages the MCP
registry globally.

## Automatic install (recommended)

In any Claude Code session, say:

> Install Tracklution server-side conversion tracking.

Claude Code's agent will run `claude mcp add ...` for you, then walk through
the MCP onboarding tools.

## Manual install

Run the command yourself:

```bash
claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp
```

> **Important**: the flag is `--transport http`, **not**
> `--transport streamable-http`. The latter currently fails with
> "Invalid transport type" in Claude Code.

Verify with:

```bash
claude mcp list
```

You should see `tracklution` in the output. Then in your Claude Code session,
type `/mcp` to confirm `tracklution` is connected.

## What happens next

Once the MCP is enabled, Claude Code calls:

1. `scout_website` — detect CMS and existing tracking
2. `register_and_provision` — create account + container
3. `get_installation_scripts` — get exact snippets
4. _(agent applies snippets)_
5. `verify_and_score` — confirm events are flowing
6. `create_login_link` — single-use Tracklution dashboard URL

See [`setup.sh`](setup.sh) for a runnable one-shot version of the command.
