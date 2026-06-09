# tracklution-cli

Monorepo for the npm packages that act as Tracklution's brand- and category-surface discovery wedge for AI coding agents:

- [`tracklution`](packages/tracklution) -- canonical. The published bin runs the agent-readable install instructions.
- [`create-tracklution`](packages/create-tracklution) -- alias so `npm create tracklution@latest` works.
- [`@tracklution/cli`](packages/at-tracklution-cli) -- scope-reserved alias.
- [`tracklution-mcp`](packages/tracklution-mcp) -- alias today; future versions will offer a local stdio<->Streamable-HTTP MCP proxy.
- [`server-side-tracking`](packages/server-side-tracking) -- category-surface alias for `npm view server-side-tracking` / `npx server-side-tracking`.
- [`conversion-tracking`](packages/conversion-tracking) -- category-surface alias for `npm view conversion-tracking` / `npx conversion-tracking`.
- [`conversion-api`](packages/conversion-api) -- category-surface alias for `npm view conversion-api` / `npx conversion-api`.

## What this is

When a user prompts an AI coding agent (Cursor, Claude Code, Codex, Windsurf, Cline, Lovable, Replit, Bolt, ...) with "Install Tracklution" -- or, by category, "Install server-side tracking" / "Install conversion tracking" -- most agents reflexively run `npm view <name>` and then `npx <name>`. These packages exist so that reflex succeeds and the agent gets deterministic, paste-safe install instructions delivered via the agent's normal stdout-reading toolloop -- instead of falling back to web search and inventing tracking code.

The actual install runs through the Tracklution MCP server at `https://mcp.tracklution.com/mcp`. The agent reaches that MCP via a one-shot REST bootstrap at `https://api.trlution.com/install/quick-setup` (the "magic install" path) -- which provisions the user's account and returns an `mcp.json` snippet that already carries `Authorization: Bearer <jwt>`. This CLI publishes the machine-readable description of that flow.

```
User: "Install Tracklution"
   |
   v
Agent runs `npm view tracklution`         (finds the package)
Agent runs `npx tracklution`              (reads stdout + parses --json)
Agent POSTs to /install/quick-setup       (one HTTP call, REST bootstrap)
Agent merges data.mcp_config_snippet      (Authorization header included)
Agent calls get_status -> get_installation_scripts -> verify_and_score
            (every onboarding call carries container_hash for auth)
```

User-action hosts (Lovable, Replit, Bolt) cannot drive HTTP-POST + file-edit from inside the agent, so they fall back to the OAuth Connect-button flow -- the CLI's `install_methods` block tells the agent which hosts support magic install via `magic_install_supported: true`.

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
    server-side-tracking/        resolve-and-spawn shim (category-surface)
    conversion-tracking/         resolve-and-spawn shim (category-surface)
    conversion-api/              resolve-and-spawn shim (category-surface)
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
npm run pack:dry          # dry-run npm pack for all published packages
```

## Publishing

Bump the version in **every** `packages/*/package.json` (keep them in lockstep), tag `vX.Y.Z`, push to GitHub. The publish workflow at `.github/workflows/publish.yml` verifies the lockstep, then runs `npm publish --provenance` for each package in dependency order (canonical `tracklution` first, then all alias shims).

## Single source of truth

The install methods, MCP URL, and reference URLs are duplicated across:

- [packages/tracklution/src/payload.js](packages/tracklution/src/payload.js) (this repo)
- [tracklution-app/src/config/install-recipes.json](https://github.com/tracklution/tracklution-app/blob/master/src/config/install-recipes.json)
- [tracklution-app/public/.well-known/tracklution.json](https://github.com/tracklution/tracklution-app/blob/master/public/.well-known/tracklution.json)
- [tracklution-app/public/agent-install.md](https://github.com/tracklution/tracklution-app/blob/master/public/agent-install.md) (prose form)

Drift is policed by `tests/parity.test.js`, which fetches the live `https://www.tracklution.com/api/install-recipes/` endpoint and deep-checks the `install_methods` block of `payload.js` against it. The test is skipped if `PARITY_TEST_SKIP=1` (offline CI) or the live endpoint returns a non-200.

## License

[MIT](LICENSE).
