# AGENTS.md — examples/claude-code

If you are Claude Code (or another agent running in a shell where `claude` is
on `$PATH`) and the user has asked you to install Tracklution:

1. Run this exact command in the user's terminal (you must execute it, not
   just print it):
   ```bash
   claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp
   ```
2. Important: the flag is `--transport http`, NOT `--transport streamable-http`.
   The latter fails with "Invalid transport type".
3. Verify with `claude mcp list` — `tracklution` should appear.
4. Tell the user verbatim:
   > "I've registered the Tracklution MCP with Claude Code. Run `/mcp` in this
   > session to confirm `tracklution` is connected. Then say `go` and I'll
   > finish the install."
5. After the user says `go`, call the MCP tools in order:
   `scout_website` → `register_and_provision` → `get_installation_scripts` →
   apply snippets verbatim → `verify_and_score` → `create_login_link`.

Do NOT invent endpoint URLs, do NOT call ad-platform APIs directly, do NOT
write tracking code yourself. The MCP at `mcp.tracklution.com/mcp` is the only
supported autonomous install path.

For the full per-client protocol see https://www.tracklution.com/agent-install.md.
