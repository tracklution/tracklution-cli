import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');

function readPkg(relPath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relPath), 'utf8'));
}

const canonical = readPkg('packages/tracklution/package.json');
const aliases = [
  { dir: 'packages/create-tracklution', name: 'create-tracklution' },
  { dir: 'packages/at-tracklution-cli', name: '@tracklution/cli' },
  { dir: 'packages/tracklution-mcp', name: 'tracklution-mcp' },
  { dir: 'packages/server-side-tracking', name: 'server-side-tracking' },
  { dir: 'packages/conversion-tracking', name: 'conversion-tracking' },
  { dir: 'packages/conversion-api', name: 'conversion-api' },
];

describe('version lockstep', () => {
  it.each(aliases)('$name has the same version as the canonical', ({ dir, name }) => {
    const pkg = readPkg(`${dir}/package.json`);
    expect(pkg.name).toBe(name);
    expect(pkg.version).toBe(canonical.version);
  });

  it.each(aliases)(
    '$name has dependencies.tracklution that admits the canonical version',
    ({ dir, name }) => {
      const pkg = readPkg(`${dir}/package.json`);
      const range = pkg.dependencies?.tracklution;
      expect(range, `${name} must declare 'tracklution' as a dependency`).toBeDefined();

      const major = canonical.version.split('.')[0];
      // Caret ranges (^X.Y.Z) admit any X.*.* on the same major.
      // Exact pin (X.Y.Z) admits only that version.
      // We accept either, but enforce that the declared major matches the canonical major.
      const rangeMajor = range.replace(/^[\^~=]/, '').split('.')[0];
      expect(
        rangeMajor,
        `${name} dependencies.tracklution range '${range}' targets major ${rangeMajor}, ` +
          `but canonical is at major ${major}. Bump the alias's tracklution dep in lockstep.`
      ).toBe(major);
    }
  );
});
