import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const canonicalBin = resolve(here, '..', 'packages/tracklution/bin/cli.js');
const RECIPES_URL = 'https://www.tracklution.com/api/install-recipes/';

const SKIP = process.env.PARITY_TEST_SKIP === '1';

function runJson() {
  const r = spawnSync(process.execPath, [canonicalBin, '--json'], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(`CLI exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

async function fetchRecipes() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(RECIPES_URL, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

describe.skipIf(SKIP)('parity with live install-recipes endpoint', () => {
  it('mcp_url matches the live endpoint', async () => {
    const local = runJson();
    let remote;
    try {
      remote = await fetchRecipes();
    } catch (err) {
      console.warn(`Skipping parity test (live endpoint unreachable): ${err.message}`);
      return;
    }
    expect(local.mcp_url).toBe(remote.mcp_url);
  });

  it('install_methods are a structural superset of the live endpoint for every shared host', async () => {
    const local = runJson();
    let remote;
    try {
      remote = await fetchRecipes();
    } catch (err) {
      console.warn(`Skipping parity test (live endpoint unreachable): ${err.message}`);
      return;
    }
    const remoteMethods = remote.mcp_install_methods ?? {};
    for (const host of Object.keys(remoteMethods)) {
      const localEntry = local.install_methods[host];
      expect(
        localEntry,
        `host '${host}' present on live endpoint but missing locally`
      ).toBeDefined();
      for (const [k, v] of Object.entries(remoteMethods[host])) {
        expect(
          localEntry[k],
          `host '${host}' field '${k}' mismatched: live=${JSON.stringify(v)} local=${JSON.stringify(localEntry[k])}`
        ).toEqual(v);
      }
    }
  });
});
