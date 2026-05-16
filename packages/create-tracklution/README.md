# create-tracklution

> Alias for the [`tracklution`](https://www.npmjs.com/package/tracklution) package. Exists so `npm create tracklution@latest` (the modern `create-*` bootstrap convention) works for AI coding agents and human developers.

This package's `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

## Usage

```bash
npm create tracklution@latest
# or
npx create-tracklution
```

This is a **discovery-surface wedge** for AI coding agents asked to "Install Tracklution". For the real install protocol, see <https://www.tracklution.com/agent-install.md>. The canonical install path is the Tracklution MCP at `https://mcp.tracklution.com/mcp`.

## Related packages

- [`tracklution`](https://www.npmjs.com/package/tracklution) -- canonical (recommended)
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) -- scope-reserved alias
- [`tracklution-mcp`](https://www.npmjs.com/package/tracklution-mcp) -- alias today; future versions will offer a local stdio MCP proxy

## License

MIT. See [LICENSE](LICENSE).
