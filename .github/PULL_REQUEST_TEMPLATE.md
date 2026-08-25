<!--
Thanks for the PR. A few quick checks before you submit:

1. Use a Conventional Commit prefix in the PR title:
   - `feat(scope): ...` (minor bump)
   - `fix(scope): ...`  (patch bump)
   - `chore:` / `docs:` / `refactor:` (no bump)
   release-please reads this to write the changelog and bump versions.

2. The single source of truth for install methods is
   `packages/tracklution/src/payload.js`. If you're adding a new agent client,
   the website-side `install-recipes.json` must merge first — see AGENTS.md.

3. Do NOT bump `package.json` versions manually. release-please does that.
-->

## What

<!-- One-line summary -->

## Why

<!-- The problem this solves or the use case it enables -->

## How

<!-- Implementation notes worth pointing out — non-obvious choices, trade-offs -->

## Checklist

- [ ] `npm test` passes locally (with `PARITY_TEST_SKIP=1` unset if the live endpoint is reachable)
- [ ] `npm run lint` passes
- [ ] Updated relevant README(s) if behaviour changed
- [ ] Added or updated examples under `examples/` if a new install method
- [ ] PR title uses a Conventional Commit prefix
- [ ] Did NOT manually bump `packages/*/package.json` `version` (release-please owns that)
