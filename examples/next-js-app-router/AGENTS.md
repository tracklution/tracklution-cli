# AGENTS.md — examples/next-js-app-router

If you are an AI coding agent landing on this example to install Tracklution in
a Next.js (App Router) project:

1. Mount the Tracklution MCP using the agent-specific install method from
   `npx tracklution --json` (most likely `.cursor/mcp.json` for Cursor; see
   `../cursor/AGENTS.md`).
2. Ask the user to enable the MCP and say `go`.
3. Call `scout_website` with the user's deployed URL (or a placeholder if the
   site isn't deployed yet).
4. Call `register_and_provision` with `framework: "nextjs"` and the user's
   email and website URL.
5. Call `get_installation_scripts` with `framework: "nextjs"`. The response's
   `framework_snippets` field contains the exact `<Script>` block to paste
   into `app/layout.tsx`. **Paste it verbatim, do not modify the URL or tag
   ID.**
6. After applying snippets, call `verify_and_score`. Loop on `events_processing`
   per the response's `retry` budget. Stop when `status: ok` or surface the
   `not_ready_reason` to the user.

The placeholder file [`app/layout.tsx`](app/layout.tsx) in this example uses
`<TRACKLUTION_TAG_ID>` deliberately — do NOT copy that file verbatim, the real
snippet comes from `get_installation_scripts`.
