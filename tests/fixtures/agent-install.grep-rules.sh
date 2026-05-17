#!/usr/bin/env bash
# Contract for https://www.tracklution.com/agent-install.md
#
# Each rule below is a `grep -qF` (fixed-string match) that MUST succeed.
# If any rule fails, the script exits non-zero so CI fails. This is the
# markdown-equivalent of the JSON Schemas in this directory: a small,
# stable set of strings the live document is required to contain.
#
# Usage:
#   bash tests/fixtures/agent-install.grep-rules.sh /tmp/agent-install.md

set -e

f="${1:-/tmp/agent-install.md}"

if [ ! -f "$f" ]; then
  echo "::error::agent-install.grep-rules.sh: file not found: $f" >&2
  exit 2
fi

assert_contains() {
  local needle="$1"
  if ! grep -qF -- "$needle" "$f"; then
    echo "::error::agent-install.md missing required string: ${needle}" >&2
    exit 1
  fi
  echo "ok: ${needle}"
}

# Canonical URLs that must be present.
# (We deliberately do NOT assert the self-referential
# `https://www.tracklution.com/agent-install.md` URL â€” the live document
# does not self-reference and there is no good reason it should.)
assert_contains 'https://mcp.tracklution.com/mcp'
assert_contains 'https://www.tracklution.com/api/install-recipes/'

# MCP onboarding tool names Ã¢â‚¬â€ these are the contract between the CLI's
# `payload.js next_steps_for_agent` and the prose protocol.
assert_contains 'scout_website'
assert_contains 'register_and_provision'
assert_contains 'get_installation_scripts'
assert_contains 'verify_and_score'
assert_contains 'create_login_link'

# Per-client install markers Ã¢â‚¬â€ at minimum the four "auto" hosts must be
# documented. The user-action hosts (lovable / replit / bolt) are also
# expected but checked less strictly.
assert_contains '.cursor/mcp.json'
assert_contains 'claude mcp add --transport http tracklution'
assert_contains '~/.codex/config.toml'
assert_contains '~/.codeium/windsurf/mcp_config.json'

# Critical agent-client enum facts
assert_contains 'agent_client'
assert_contains 'cline'

echo "all agent-install.md grep-rules passed"
