# tracklution-mcp

> Discovery wedge for the [Tracklution](https://www.tracklution.com) MCP server at `https://mcp.tracklution.com/mcp`.

**Today, this package is an alias of the [`tracklution`](https://www.npmjs.com/package/tracklution) package.** Its `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

**In a future version, this package will also ship a local stdio<->Streamable-HTTP MCP proxy** so that AI coding agents whose host clients don't yet support remote MCP can still connect to `https://mcp.tracklution.com/mcp` via the standard local-stdio MCP transport.

## Usage today

```bash
npx tracklution-mcp
```

Prints the Tracklution agent install protocol to stdout. AI coding agents should:

1. Add an MCP server entry to their client pointing at `https://mcp.tracklution.com/mcp` (the canonical remote endpoint).
2. Ask the user to enable the `tracklution` MCP.
3. Call the MCP onboarding tools (`scout_website`, `register_and_provision`, `get_installation_scripts`, `verify_and_score`).

Full per-host protocol: <https://www.tracklution.com/agent-install.md>.

## Usage in a future version

```bash
# (planned, not yet implemented)
npx tracklution-mcp --stdio
```

Will run a local stdio MCP server that proxies all requests to `https://mcp.tracklution.com/mcp`. Useful for hosts that don't yet support remote MCP (early Codex builds, some Claude Desktop versions, etc.). When that ships, this README will be updated.

## Related packages

- [`tracklution`](https://www.npmjs.com/package/tracklution) -- canonical (recommended)
- [`create-tracklution`](https://www.npmjs.com/package/create-tracklution) -- so `npm create tracklution@latest` works
- [`@tracklution/cli`](https://www.npmjs.com/package/@tracklution/cli) -- scope-reserved alias

## License

MIT. See [LICENSE](LICENSE).
