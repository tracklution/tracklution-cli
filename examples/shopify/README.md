# Tracklution + Shopify

This example shows where the Tracklution tracking script goes in a Shopify
theme. The agent edits one file: `layout/theme.liquid`.

> **Note**: the snippet below uses `<TRACKLUTION_TAG_ID>` as a placeholder.
> The real tag ID comes from the MCP server's `get_installation_scripts` tool
> when called with `framework: "shopify"`. Do not commit this template verbatim
> to a real shop.

## What the agent writes

The agent inserts a script block right before `</body>` in `layout/theme.liquid`.
See [`layout/theme.liquid`](layout/theme.liquid) for the placeholder version.

## What about checkout?

Shopify's checkout pages (`checkout.liquid`) are accessible only on Shopify
Plus. For lower tiers, the Tracklution recommendation is:

1. Use **Shopify Pixels** (the official mechanism for adding tracking to the
   checkout flow). The MCP's `get_installation_scripts` returns the pixel
   payload when called with `framework: "shopify"`.
2. Set up a **`checkout.completed` webhook** in Shopify admin pointing at the
   webhook URL the MCP gives you. This is the server-side path for `Purchase`
   events and is the most reliable.

The MCP onboarding flow walks the user through both setup steps.

## Manual setup

If you prefer to install without an AI agent:

1. Sign up at [tracklution.com/start](https://www.tracklution.com/start).
2. Pick `shopify` as your framework.
3. Copy the snippet shown in the dashboard into `layout/theme.liquid`.
4. Follow the on-screen instructions for the checkout pixel + webhook.

## Requirements

- A Shopify store (any plan; Plus required only for `checkout.liquid` access).
- Theme editor access (Online Store → Themes → Edit code).
