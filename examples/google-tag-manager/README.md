# Tracklution + Google Tag Manager

GTM is the universal escape hatch — if a site already uses GTM, you can install
Tracklution as a Custom HTML tag without touching the codebase. This is the
canonical path for WordPress / Squarespace / any site you don't control.

> **Note**: the snippet below uses `<TRACKLUTION_TAG_ID>` as a placeholder.
> The real ID comes from the MCP server's `get_installation_scripts` tool
> when called with `framework: "gtm"`.

## Manual setup

1. Open Google Tag Manager.
2. Click **Tags → New → Tag Configuration → Custom HTML**.
3. Paste the snippet from [`gtm-tag.html`](gtm-tag.html) into the HTML field.
4. **Triggering**: set to **All Pages**.
5. Name the tag `Tracklution Pixel` and save.
6. Click **Submit** to publish.

That gives you `PageView` automatically. For custom events (`Purchase`, `Lead`,
etc.), create separate Custom HTML tags triggered by the relevant GTM event
(`Custom Event` trigger type).

## Automatic setup via AI agent

If you're using Cursor / Claude Code / etc., just ask the agent to "install
Tracklution via Google Tag Manager". The MCP onboarding flow has a `gtm` path
that walks you through the GTM workspace setup.

## What the agent writes

For GTM specifically, the agent doesn't write any project files — it gives you
the snippet to paste into GTM's Custom HTML field. The
[`gtm-tag.html`](gtm-tag.html) file in this directory is the placeholder
template.

For a more polished integration, you can also use the official Tracklution
**GTM Template** in the GTM Community Template Gallery — search for
"Tracklution" inside GTM's Tag template gallery.

## Requirements

- A Google Tag Manager container installed on the site.
- Publish permission on the GTM workspace.
