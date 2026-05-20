import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

const aliasBins = [
  resolve(repoRoot, 'packages/create-tracklution/bin/cli.js'),
  resolve(repoRoot, 'packages/at-tracklution-cli/bin/cli.js'),
  resolve(repoRoot, 'packages/tracklution-mcp/bin/cli.js'),
  resolve(repoRoot, 'packages/server-side-tracking/bin/cli.js'),
  resolve(repoRoot, 'packages/conversion-tracking/bin/cli.js'),
  resolve(repoRoot, 'packages/conversion-api/bin/cli.js'),
];

function run(bin, args = []) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

describe.each(aliasBins)('alias shim %s', (bin) => {
  it('--json forwards to canonical and reports name "tracklution"', () => {
    const r = run(bin, ['--json']);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    const payload = JSON.parse(r.stdout);
    expect(payload.name).toBe('tracklution');
    expect(payload.kind).toBe('agent-install-bootstrap');
    expect(payload.mcp_url).toBe('https://mcp.tracklution.com/mcp');
  });

  it('default text mode contains the same sentinel strings as the canonical', () => {
    const r = run(bin);
    expect(r.status, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toContain('AI AGENT INSTRUCTIONS');
    expect(r.stdout).toContain('MCP URL:   https://mcp.tracklution.com/mcp');
    expect(r.stdout).toContain('https://www.tracklution.com/agent-install.md');
  });
});
