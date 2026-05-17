# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From v1.0.1 onwards this file is maintained automatically by
[release-please](https://github.com/googleapis/release-please) in manifest mode
with linked versions across all four packages — do not edit it by hand below
the next release banner.

## [1.0.0] - 2026-05

Initial public release.

### Added

- Canonical `tracklution` package — `bin/cli.js` with `--version`, `--help`,
  `--json` and default text output.
- Three alias packages: `create-tracklution` (so `npm create tracklution@latest`
  works), `@tracklution/cli` (scope-reserved alias), and `tracklution-mcp`
  (alias today; future v2 will ship a local stdio↔Streamable-HTTP proxy).
- Install methods for seven AI coding agent clients: Cursor, Claude Code,
  Codex CLI, Windsurf, Lovable, Replit Agent, Bolt.
- Parity test against the live `install-recipes` endpoint at
  `https://www.tracklution.com/api/install-recipes/`.
- Version-lockstep test across all four packages.
- Pack-manifest hygiene tests for all four packages.
- CI matrix: Node 18 / 20 / 22 on ubuntu, plus Node 20 on windows + macos.
- Provenance-signed publishing via GitHub Actions (`npm publish --provenance`).
