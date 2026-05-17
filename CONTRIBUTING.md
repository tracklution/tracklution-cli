# Contributing to tracklution-cli

Thanks for the interest. This repo is the public npm discovery wedge for
[Tracklution](https://www.tracklution.com) server-side conversion tracking.

If you are an AI coding agent contributing, read [AGENTS.md](AGENTS.md) first —
it covers the invariants you must not break.

## Development setup

```bash
git clone git@github.com:tracklution/tracklution-cli.git
cd tracklution-cli
npm install        # installs workspace deps + symlinks packages/* inter-package
npm test           # 5 test files, ~40 tests
npm run lint       # syntax-checks every bin/cli.js
npm run pack:dry   # dry-run npm pack for all four packages
```

Requirements: Node 18, 20, or 22. CI runs all three on ubuntu plus Node 20 on
windows + macos.

## What you can contribute

- **New AI agent client install method** — most common. See AGENTS.md ("How to
  add a new agent client install method") for the seven-step recipe.
- **New examples** under `examples/` — each example must be self-contained,
  have its own `README.md` and `AGENTS.md`, and use `<TRACKLUTION_TAG_ID>` as
  the placeholder for the per-account tag the MCP server actually issues.
- **Documentation** — typo fixes, clarifications, broken-link repairs.
- **Bug reports** — use the [Issue templates](.github/ISSUE_TEMPLATE/), in
  particular the `Agent Report` form if you tried an install and something
  unexpected happened.

## What we manage internally (not accepted as PRs)

- The MCP server at `mcp.tracklution.com` is closed-source. Bug reports about
  its behaviour are welcome via [SECURITY.md](SECURITY.md) but PRs are not.
- The Tracklution product itself (tracking pipeline, dashboard) is closed.

## Conventional Commits

This repo uses [release-please](https://github.com/googleapis/release-please)
in manifest mode for version automation. Your commit messages drive the
changelog and version bumps:

- `feat(scope): ...` → minor bump
- `fix(scope): ...` → patch bump
- `chore: ...` / `docs: ...` / `refactor: ...` → no bump

Conventional-Commits is enforced by `commitlint` (local pre-commit warn mode).
If you forget the prefix, just push a follow-up commit with the right shape.

## Tests

There are **five** test files in `tests/`:

| File | What it does |
|---|---|
| `cli.test.js` | Default/--json/--version/--help + payload shape |
| `parity.test.js` | Compares local payload to live install-recipes endpoint |
| `aliases.test.js` | Each shim emits the same stdout as canonical |
| `versions.test.js` | All four packages stay at the same version |
| `pack.test.js` | Each package's npm-pack manifest is hygienic |

The parity test can be skipped offline with `PARITY_TEST_SKIP=1` (the CI sets
this on PR runs but not on main pushes — so don't let drift accumulate).

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Questions

Open a [Discussion](https://github.com/tracklution/tracklution-cli/discussions)
in the `Q&A` category.
