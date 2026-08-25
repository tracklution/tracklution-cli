#!/usr/bin/env node
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const ALIAS_NAME = 'server-side-tracking';

function main() {
  const require = createRequire(import.meta.url);

  let canonicalPath;
  try {
    canonicalPath = require.resolve('tracklution/bin/cli.js');
  } catch {
    process.stderr.write(
      [
        `${ALIAS_NAME}: cannot resolve canonical 'tracklution' package.`,
        `This package is a thin alias that forwards to 'tracklution'.`,
        `Reinstall, or run the canonical directly with:`,
        `  npx tracklution`,
        ``,
        `Canonical install protocol: https://www.tracklution.com/agent-install.md`,
        `MCP URL: https://mcp.tracklution.com/mcp`,
        ``,
      ].join('\n')
    );
    return 1;
  }

  const result = spawnSync(
    process.execPath,
    [canonicalPath, ...process.argv.slice(2)],
    { stdio: 'inherit' }
  );

  if (result.error) {
    process.stderr.write(
      `${ALIAS_NAME}: failed to invoke canonical CLI: ${result.error.message}\n`
    );
    return 1;
  }

  return result.status ?? 1;
}

process.exitCode = main();
