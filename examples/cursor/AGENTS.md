# AGENTS.md — examples/cursor

If you are an AI coding agent running inside Cursor and the user has asked you
to install Tracklution:

1. Verify Cursor is at v0.48.0 or newer (Streamable HTTP transport is required
   for remote MCP). If older, ask the user to update first.
2. Create `.cursor/mcp.json` in the project root (NOT `~/.cursor/mcp.json`
   unless the user prefers user-global). If the file already exists with other
   MCP servers, merge the `tracklution` entry into `mcpServers` without
   removing other entries.
3. The file body is exactly:
   ```json
   {
     "mcpServers": {
       "tracklution": {
         "url": "https://mcp.tracklution.com/mcp"
       }
     }
   }
   ```
4. Tell the user verbatim:
   > "I've added the Tracklution MCP at `https://mcp.tracklution.com/mcp` to
   > `.cursor/mcp.json`. Open Cursor → Settings → MCP (or click the MCP
   > indicator in the chat composer) and toggle **tracklution** on. Then say
   > `go` and I'll finish the install."
5. After the user says `go`, call the MCP tools in order:
   `scout_website` → `register_and_provision` → `get_installation_scripts` →
   apply snippets verbatim → `verify_and_score` → `create_login_link`.

Do NOT invent endpoint URLs, do NOT call ad-platform APIs directly, do NOT
write tracking code yourself. The MCP at `mcp.tracklution.com/mcp` is the only
supported autonomous install path.

For the full per-client protocol see https://www.tracklution.com/agent-install.md.
