import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const isWindows = process.platform === 'win32';

function packDryRun(workspace) {
  const r = spawnSync(
    isWindows ? 'npm.cmd' : 'npm',
    ['pack', '--workspace', workspace, '--json', '--dry-run'],
    { cwd: repoRoot, encoding: 'utf8', shell: isWindows }
  );
  if (r.status !== 0) {
    throw new Error(
      `npm pack --workspace ${workspace} failed (status ${r.status}):\n${r.stderr}\n${r.stdout}`
    );
  }
  const parsed = JSON.parse(r.stdout);
  // npm pack --json returns an array (one entry per workspace packed).
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!entry || !entry.files) {
    throw new Error(`npm pack --json output missing 'files': ${r.stdout}`);
  }
  return entry;
}

function relPaths(packResult) {
  // Normalize path separators so the assertions work on Windows runners too.
  return packResult.files.map((f) => f.path.replace(/\\/g, '/'));
}

describe('pack manifest: tracklution (canonical)', () => {
  let entry;
  let paths;
  it('packs without error', () => {
    entry = packDryRun('tracklution');
    paths = relPaths(entry);
    expect(entry.name).toBe('tracklution');
  });
  it('ships bin, src, README, LICENSE, package.json', () => {
    expect(paths).toContain('bin/cli.js');
    expect(paths).toContain('src/payload.js');
    expect(paths).toContain('package.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('LICENSE');
  });
  it('does not ship node_modules, tests, or dev artifacts', () => {
    for (const p of paths) {
      expect(p, `unexpected file in tarball: ${p}`).not.toMatch(/^node_modules\//);
      expect(p, `unexpected file in tarball: ${p}`).not.toMatch(/^tests\//);
      expect(p, `unexpected file in tarball: ${p}`).not.toMatch(/\.test\.js$/);
    }
  });
});

describe.each([
  { workspace: 'create-tracklution', expectedName: 'create-tracklution' },
  { workspace: '@tracklution/cli', expectedName: '@tracklution/cli' },
  { workspace: 'tracklution-mcp', expectedName: 'tracklution-mcp' },
])('pack manifest: $expectedName (alias)', ({ workspace, expectedName }) => {
  let entry;
  let paths;
  it('packs without error and reports the correct name', () => {
    entry = packDryRun(workspace);
    paths = relPaths(entry);
    expect(entry.name).toBe(expectedName);
  });
  it('ships bin, README, LICENSE, package.json', () => {
    expect(paths).toContain('bin/cli.js');
    expect(paths).toContain('package.json');
    expect(paths).toContain('README.md');
    expect(paths).toContain('LICENSE');
  });
  it('does NOT ship src (aliases have no payload module of their own)', () => {
    for (const p of paths) {
      expect(p, `alias shouldn't ship src/: ${p}`).not.toMatch(/^src\//);
    }
  });
});
