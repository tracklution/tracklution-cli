# AGENTS.md — examples/google-tag-manager

If you are an AI coding agent helping a user install Tracklution via Google
Tag Manager:

1. Mount the Tracklution MCP using your agent-specific install method (see
   `../cursor/AGENTS.md` or `../claude-code/AGENTS.md`).
2. Ask the user to enable the MCP and say `go`.
3. Call `scout_website` with the user's URL.
4. Call `register_and_provision` with `framework: "html"`.
5. Call `select_installation_method` with `method: "gtm"`.
6. Call `get_installation_scripts` with `framework: "html"` and
   `event_source_system: "gtm"`. The response contains:
   - The Custom HTML snippet to paste into a GTM Custom HTML tag.
   - The recommended trigger configuration (All Pages for the base pixel,
     custom events for `Purchase` / `Lead` / etc.).
7. Walk the user through GTM admin (this is a user-action step, you can't edit
   their GTM container yourself):
   - Open GTM → Tags → New → Custom HTML.
   - Paste the snippet, set the trigger to All Pages.
   - Save the tag, then Submit + Publish.
8. Tell the user to load their site in a private/incognito window once, then
   say `go`.
9. Call `verify_and_score`. If the response is
   `not_ready_reason: no_events_after_install`, ask the user to refresh the
   site again. Loop per the `retry` budget.

The placeholder [`gtm-tag.html`](gtm-tag.html) is a template — the real
snippet comes from `get_installation_scripts`.
