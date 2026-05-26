# tracklution-mcp

> Discovery wedge for the [Tracklution](https://www.tracklution.com) MCP server at `https://mcp.tracklution.com/mcp`.

**Today, this package is an alias of the [`tracklution`](https://www.npmjs.com/package/tracklution) package.** Its `bin` is a thin shim that resolves `tracklution` (its sole dependency) and invokes its CLI. The stdout you see is identical to running `npx tracklution`.

**In a future version, this package will also ship a local stdio<->Streamable-HTTP MCP proxy** so that AI coding agents whose host clients don't yet support remote MCP can still connect to `https://mcp.tracklution.com/mcp` via the standard local-stdio MCP transport.

## Usage today

```bash
npx tracklution-mcp
```

Prints the Tracklution agent install protocol to stdout. AI coding agents should:

1. POST one HTTPS request to `https://api.trlution.com/install/quick-setup` and merge the returned `mcp_config_snippet` into the host's MCP config (the Bearer JWT is already attached — the MCP comes up authenticated).
2. Ask the user to enable the `tracklution` MCP and reply `go`.
3. Call `get_installation_scripts` then `verify_and_score` to finish the install. (`scout_website` and account provisioning are handled server-side by the bootstrap endpoint.)

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
- [`server-side-tracking`](https://www.npmjs.com/package/server-side-tracking) -- category-surface alias
- [`conversion-tracking`](https://www.npmjs.com/package/conversion-tracking) -- category-surface alias
- [`conversion-api`](https://www.npmjs.com/package/conversion-api) -- category-surface alias

## License

MIT. See [LICENSE](LICENSE).
