# @tracklution/cli

> Scope-reserved alias for the [`tracklution`](https://www.npmjs.com/package/tracklution) package. Exists so the `@tracklution/*` namespace points to the canonical Tracklution CLI for AI coding agents and human developers.

This package's `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

## Usage

```bash
npx @tracklution/cli
```

This is a **discovery-surface wedge** for AI coding agents asked to "Install Tracklution". For the real install protocol, see <https://www.tracklution.com/agent-install.md>. The canonical install path is the Tracklution MCP at `https://mcp.tracklution.com/mcp`.

## Related packages

- [`tracklution`](https://www.npmjs.com/package/tracklution) -- canonical (recommended)
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) -- so `npm create tracklution@latest` works
- [`tracklution-mcp`](https://www.npmjs.com/package/tracklution-mcp) -- alias today; future versions will offer a local stdio MCP proxy
- [`server-side-tracking`](https://www.npmjs.com/package/server-side-tracking) -- category-surface alias
- [`conversion-tracking`](https://www.npmjs.com/package/conversion-tracking) -- category-surface alias
- [`conversion-api`](https://www.npmjs.com/package/conversion-api) -- category-surface alias

## License

MIT. See [LICENSE](LICENSE).
