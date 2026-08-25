# AGENTS.md — examples/shopify

If you are an AI coding agent helping a user install Tracklution on a Shopify
store:

1. Mount the Tracklution MCP using your agent-specific install method (see
   `../cursor/AGENTS.md` or `../claude-code/AGENTS.md`).
2. Ask the user to enable the MCP and say `go`.
3. Call `scout_website` with the user's `*.myshopify.com` URL or their custom
   domain.
4. Call `register_and_provision` with `framework: "html"` — Shopify-specific
   server-side integration is handled by `select_installation_method` next.
5. Call `select_installation_method` with `method: "shopify"` to register that
   the user wants the Shopify variant. The MCP backend uses this to deliver
   Shopify-tailored verification + webhook templates.
6. Call `get_installation_scripts` with `framework: "html"` and
   `event_source_system: "shopify"`. The response contains:
   - The `<script>` tag to add to `layout/theme.liquid` (paste verbatim above
     `</body>`).
   - The Shopify webhook URL for `checkout.completed` events.
   - The Shopify Pixels payload (for stores on Plus).
7. Walk the user through pasting the script tag and configuring the
   `checkout.completed` webhook in Shopify admin (`Settings → Notifications →
   Webhooks`). This is a user-action step — print the exact webhook URL and
   wait for confirmation.
8. Call `verify_and_score`. If the response is
   `not_ready_reason: no_events_after_install`, ask the user to place a test
   order. Loop per the `retry` budget.

The placeholder file [`layout/theme.liquid`](layout/theme.liquid) is a
template, NOT a working snippet — the real one comes from
`get_installation_scripts`.
