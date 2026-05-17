#!/usr/bin/env bash
# Install the Tracklution MCP server in Claude Code.
#
# This is a one-shot equivalent of:
#   claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp
#
# After this runs, open Claude Code, type `/mcp`, and confirm `tracklution` is
# connected. Then ask the agent to finish the install.

set -e

if ! command -v claude >/dev/null 2>&1; then
  echo "error: 'claude' command not found on PATH." >&2
  echo "       Install Claude Code first: https://claude.ai/code" >&2
  exit 1
fi

# IMPORTANT: --transport http (NOT --transport streamable-http)
claude mcp add --transport http tracklution https://mcp.tracklution.com/mcp

echo
echo "Tracklution MCP registered. Verify with:"
echo "  claude mcp list"
echo
echo "Then in any Claude Code session, type /mcp to confirm 'tracklution' is connected."
