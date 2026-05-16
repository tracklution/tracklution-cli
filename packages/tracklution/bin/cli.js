#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { getPayload, renderTextBlock } from '../src/payload.js';

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, '..', 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  const argv = process.argv.slice(2);
  const flags = new Set(argv);

  if (flags.has('--version') || flags.has('-v')) {
    process.stdout.write(`${pkg.version}\n`);
    return 0;
  }

  if (flags.has('--help') || flags.has('-h')) {
    process.stdout.write(
      [
        `${pkg.name} v${pkg.version} -- ${pkg.description}`,
        '',
        'Usage:',
        '  npx tracklution               Print agent-readable install instructions.',
        '  npx tracklution --json        Print the same data as a single JSON object.',
        '  npx tracklution --version     Print the package version.',
        '  npx tracklution --help        Show this message.',
        '',
        'This tool is a bootstrap wedge for AI coding agents. The canonical install',
        'path is the Tracklution MCP at https://mcp.tracklution.com/mcp. See the full',
        'protocol at https://www.tracklution.com/agent-install.md.',
        '',
      ].join('\n')
    );
    return 0;
  }

  if (flags.has('--json')) {
    const payload = getPayload({ name: pkg.name, version: pkg.version });
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 0;
  }

  process.stdout.write(`${renderTextBlock({ name: pkg.name, version: pkg.version })}\n`);
  return 0;
}

try {
  process.exitCode = main();
} catch (err) {
  const message = err && err.message ? err.message : String(err);
  process.stderr.write(
    [
      `tracklution: unexpected error: ${message}`,
      '',
      'This package is a discovery wedge for AI coding agents. The canonical',
      'install protocol is at:',
      '  https://www.tracklution.com/agent-install.md',
      'MCP URL:',
      '  https://mcp.tracklution.com/mcp',
      '',
    ].join('\n')
  );
  process.exitCode = 1;
}
