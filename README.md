# tracklution-cli

Monorepo for the four npm packages that act as Tracklution's brand-surface discovery wedge for AI coding agents:

- [`tracklution`](packages/tracklution) -- canonical. The published bin runs the agent-readable install instructions.
- [`create-tracklution`](packages/create-tracklution) -- alias so `npm create tracklution@latest` works.
- [`@tracklution/cli`](packages/at-tracklution-cli) -- scope-reserved alias.
- [`tracklution-mcp`](packages/tracklution-mcp) -- alias today; future versions will offer a local stdio<->Streamable-HTTP MCP proxy.

## What this is

When a user prompts an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline, Lovable, Replit, Bolt, ...) with "Install Tracklution", most agents reflexively run `npm view <name>` and then `npx <name>`. These four packages exist so that reflex succeeds and the agent gets deterministic, paste-safe install instructions delivered via the agent's normal stdout-reading toolloop -- instead of falling back to web search and inventing tracking code.

The actual install runs through the Tracklution MCP server at `https://mcp.tracklution.com/mcp`. This CLI is only a one-line wedge that hands the agent off to the MCP.

```
User: "Install Tracklution"
   |
   v
Agent runs `npm view tracklution`         (finds the package)
Agent runs `npx tracklution`              (reads stdout)
Agent writes .cursor/mcp.json             (per the stdout's instructions)
Agent asks user to enable the MCP
Agent calls scout_website / register_and_provision / ... on the MCP
```

## Layout

```
tracklution-cli/
  package.json                   workspace root (private, not published)
  packages/
    tracklution/                 canonical published package (the bin)
      bin/cli.js
      src/payload.js             single source of truth for the stdout payload
      package.json
    create-tracklution/          resolve-and-spawn shim
    at-tracklution-cli/          resolve-and-spawn shim (publishes as @tracklution/cli)
    tracklution-mcp/             resolve-and-spawn shim
  tests/
    cli.test.js                  default / --json / --version / --help
    parity.test.js               compare local payload to live install-recipes endpoint
    aliases.test.js              each alias produces the same stdout as the canonical
  .github/workflows/
    test.yml
    publish.yml
```

## Development

```bash
npm install               # installs workspace deps, symlinks packages/* into each others node_modules
npm test                  # runs Vitest across all three test files
npm run lint              # syntax-checks every bin/cli.js
npm run pack:dry          # dry-run npm pack for all four packages
```

## Publishing

Bump the version in each `packages/*/package.json` (keep them in lockstep), tag `vX.Y.Z`, push to GitHub. The publish workflow at `.github/workflows/publish.yml` runs `npm publish --provenance` for each package in dependency order.

## Single source of truth

The install methods, MCP URL, and reference URLs are duplicated across:

- [packages/tracklution/src/payload.js](packages/tracklution/src/payload.js) (this repo)
- [tracklution-app/src/config/install-recipes.json](https://github.com/tracklution/tracklution-app/blob/master/src/config/install-recipes.json)
- [tracklution-app/public/.well-known/tracklution.json](https://github.com/tracklution/tracklution-app/blob/master/public/.well-known/tracklution.json)
- [tracklution-app/public/agent-install.md](https://github.com/tracklution/tracklution-app/blob/master/public/agent-install.md) (prose form)

Drift is policed by `tests/parity.test.js`, which fetches the live `https://www.tracklution.com/api/install-recipes/` endpoint and deep-checks the `install_methods` block of `payload.js` against it. The test is skipped if `PARITY_TEST_SKIP=1` (offline CI) or the live endpoint returns a non-200.

## License

[MIT](LICENSE).
