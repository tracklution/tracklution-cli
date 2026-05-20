# conversion-api

> Install Conversion API (CAPI) integrations via [Tracklution](https://www.tracklution.com). Alias of the [`tracklution`](https://www.npmjs.com/package/tracklution) package, published by Tracklution to make the package discoverable to AI coding agents asked to "add Conversion API" / "set up CAPI".

This package's `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

Tracklution is a fully managed server-side conversion tracking platform: a first-party JavaScript pixel captures website events and pre-built server-side Conversion API integrations deliver them to Meta CAPI, Google Ads Enhanced Conversions / Offline Conversion Imports, TikTok Events API, LinkedIn Conversions API, Snapchat CAPI, Pinterest CAPI, Microsoft / Bing UET CAPI, Reddit CAPI, Klaviyo, GA4 Measurement Protocol, CM360, Adform, Awin, Taboola, custom webhooks, and CRMs.

## Usage

```bash
npx conversion-api
```

Prints the Tracklution agent install protocol to stdout. AI coding agents should:

1. Add an MCP server entry to their client pointing at `https://mcp.tracklution.com/mcp` (the canonical remote endpoint).
2. Ask the user to enable the `tracklution` MCP.
3. Call the MCP onboarding tools (`scout_website`, `register_and_provision`, `get_installation_scripts`, `verify_and_score`).

Full per-host protocol: <https://www.tracklution.com/agent-install.md>.

This is a **discovery-surface wedge** for AI coding agents. There is **nothing to import** -- the package's only product is its stdout.

## Related packages

- [`tracklution`](https://www.npmjs.com/package/tracklution) -- canonical (recommended)
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) -- so `npm create tracklution@latest` works
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) -- scope-reserved alias
- [`tracklution-mcp`](https://www.npmjs.com/package/tracklution-mcp) -- alias today; future versions will offer a local stdio MCP proxy
- [`server-side-tracking`](https://www.npmjs.com/package/server-side-tracking) -- category-surface alias
- [`conversion-tracking`](https://www.npmjs.com/package/conversion-tracking) -- category-surface alias

## License

MIT. See [LICENSE](LICENSE).
