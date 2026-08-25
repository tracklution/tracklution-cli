# AGENTS.md

> Instructions for AI coding agents contributing to this repository.
>
> This file is intentionally at the **repository root** (not under `.github/`) so
> any agent crawling the repo finds it on the first directory listing.
>
> If you are an AI coding agent contributing here, read this top-to-bottom
> before touching any file. The repo's correctness depends on a small set of
> invariants and a single source-of-truth file. Break those and CI fails.

## What this repo is

The four npm packages in `packages/` are a discovery wedge for the Tracklution
MCP server at `https://mcp.tracklution.com/mcp`. When a developer asks an AI
agent to "Install Tracklution", the agent runs `npx tracklution` (or one of the
three aliases) and parses the deterministic stdout to mount the MCP. The actual
tracking install happens through the MCP server's onboarding tools — this repo
ships none of that logic.

This is **not** a tracking SDK. There is nothing to `import`. The product is
stdout.

## Single source of truth

The install payload — MCP URL, the seven (soon eight) install methods, the
agent next-steps list — lives in exactly one place:

[`packages/tracklution/src/payload.js`](packages/tracklution/src/payload.js)

It is mirrored, never duplicated, on the website side at:

- `https://www.tracklution.com/api/install-recipes/` (`tracklution-app/src/config/install-recipes.json`)
- `https://www.tracklution.com/.well-known/tracklution.json`
- `https://www.tracklution.com/agent-install.md` (prose form)

Drift is policed by [`tests/parity.test.js`](tests/parity.test.js), which
fetches the live install-recipes endpoint and deep-compares every shared host's
fields against `payload.js`. Vitest's `.toEqual` is symmetric — extra keys in
either side fail. If you change a string in `payload.js`, you almost certainly
need to change the same string in `install-recipes.json` first, then verify
production has redeployed, then update `payload.js`.

## Invariants you MUST NOT break

1. **The MCP URL is `https://mcp.tracklution.com/mcp`.** Don't invent a new
   one, don't add staging URLs to the published payload, don't parameterize it.
2. **All four packages share one version.** [`tests/versions.test.js`](tests/versions.test.js)
   enforces lockstep. Version bumps happen via release-please (see below), not
   by editing `package.json` files manually.
3. **The canonical package is `packages/tracklution/`.** The other three —
   `create-tracklution`, `at-tracklution-cli`, `tracklution-mcp` — are
   resolve-and-spawn shims. Do not add logic to them. If you need new
   behaviour, add it to the canonical and re-test the aliases via
   [`tests/aliases.test.js`](tests/aliases.test.js).
4. **The canonical package is zero-dependency.** It uses only Node.js
   built-ins. If you find yourself wanting to `npm install` anything into
   `packages/tracklution/`, stop and ask first.
5. **Run `npm test && npm run lint` before committing.** The parity test can
   be skipped offline with `PARITY_TEST_SKIP=1` but must pass in CI.

## How to add a new agent client install method

The most common task. Example: add support for a hypothetical agent called
"foobar".

1. **Add the entry on the website side first** — `tracklution-app/src/config/install-recipes.json`
   `mcp_install_methods.foobar`. Update the route test in
   `tracklution-app/src/app/api/install-recipes/route.test.ts` to assert the
   new entry exists. Bump the top-level `version` field. Merge that PR and
   wait for the Vercel deploy.
2. **Verify the live deploy** — `curl -fsS https://www.tracklution.com/api/install-recipes/ | jq '.mcp_install_methods.foobar'`
   must return non-null before continuing.
3. **Mirror the entry in `payload.js`** — copy the JSON shape byte-for-byte.
   The parity test will fail otherwise.
4. **Add the host name to `REQUIRED_HOSTS`** in
   [`tests/cli.test.js`](tests/cli.test.js) (currently lines 38-46).
5. **Add an `mcp_url` consistency assertion** to the block at
   [`tests/cli.test.js`](tests/cli.test.js) lines 184-193, e.g.
   `expect(payload.install_methods.foobar.body.url).toBe(mcpUrl);` for a
   file-edit method, or the equivalent for cli / user-action types.
6. **Add an `examples/foobar/` directory** with a `README.md`, `AGENTS.md`,
   and a sample config file.
7. **Commit with a Conventional Commit prefix** so release-please picks it up:
   `feat(install-methods): add foobar install method`.

`renderTextBlock()` in `payload.js` lists the supported agents by name in its
header blurb — update that line too if the new client should be in the
human-facing summary.

## How to bump the version

You don't. release-please does it.

Push your `feat:` or `fix:` commits to `main`. The
`.github/workflows/release-please.yml` workflow runs on push and opens (or
updates) a single Release PR titled `chore(main): release X.Y.Z`. Merging that
Release PR creates the `vX.Y.Z` git tag, which triggers
[`.github/workflows/publish.yml`](.github/workflows/publish.yml) to publish all
four packages to npm with `--provenance`.

**One-time setup required**: GitHub Actions deliberately prevents `GITHUB_TOKEN`-driven
events (like the tag push that release-please creates) from triggering downstream
workflows. To make the tag → publish chain automatic, create a fine-grained PAT
with `Contents: read & write`, `Pull requests: read & write`, and
`Workflows: read & write` scoped to this repo, then store it as the
`RELEASE_PLEASE_TOKEN` repo secret. The workflow falls back to `GITHUB_TOKEN`
if the secret is unset, but in that case you must manually invoke publishing
after merging each Release PR:

```bash
gh workflow run publish.yml --ref vX.Y.Z
```

The release-please config uses the `linked-versions` plugin so all four
packages always share a version. Don't edit any `packages/*/package.json`
`version` field by hand — it collides with release-please.

If release-please's Release PR is missing or wrong, do NOT amend + force-push
to `main` (that requires disabling branch protection). Instead push an empty
commit with the correct Conventional prefix:

```bash
git commit --allow-empty -m "feat(install-methods): retrigger release-please"
git push origin main
```

## Discovery surfaces (for reference)

All always-on, all CORS-open:

- [agent-install.md](https://www.tracklution.com/agent-install.md) — canonical agent install protocol
- [llms.txt](https://www.tracklution.com/llms.txt) — knowledge base index
- [.well-known/tracklution.json](https://www.tracklution.com/.well-known/tracklution.json) — service directory
- [api/install-recipes/](https://www.tracklution.com/api/install-recipes/) — machine-readable install methods
- [openapi.json](https://www.tracklution.com/openapi.json) — public webhook OpenAPI

The CI workflow [`.github/workflows/docs.yml`](.github/workflows/docs.yml)
validates these against JSON Schemas in `tests/fixtures/` on every PR and
nightly.

## When in doubt

Yes, boss — open a Discussion in the `Q&A` category. Don't guess at protocol
changes that touch the live MCP — those almost always require a coordinated
change on the `tracklution-app` and `tracklution-mcp` repos too.
