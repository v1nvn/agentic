import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolve } from '../src/resolve.js';
import {
  createHomes,
  snapshotTree,
  writeCacheVersion,
  writeEchoBins,
  writeInstalledPlugins,
  writeSettings,
} from './fixtures.js';

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

describe('resolve', () => {
  it('resolves the installPath named by installed_plugins.json over newer cache versions', () => {
    const home = homes.newHome();
    writeSettings(home, '{"model":"opus-4"}\n');
    writeCacheVersion(home, '0.19.0');
    const installDir = writeEchoBins(
      join(home, '.claude', 'plugins', 'store', 'statusline-0.10.0'),
      'installed-0.10.0',
    );
    writeInstalledPlugins(home, {
      'statusline-lab@agentic': [{ installPath: installDir }],
    });
    const before = snapshotTree(home);

    expect(resolve({ home }).pluginDir).toBe(installDir);
    expect(snapshotTree(home)).toEqual(before);
  });

  it('falls back to the newest cache version dir, version-sorted not lexicographic', () => {
    const home = homes.newHome();
    writeCacheVersion(home, '0.9.0');
    writeCacheVersion(home, '0.10.0');
    writeCacheVersion(home, '0.19.0');

    // 0.9.0 wins lexicographically; only a version sort picks 0.19.0.
    expect(resolve({ home }).pluginDir).toBe(
      join(
        home,
        '.claude',
        'plugins',
        'cache',
        'agentic',
        'statusline-lab',
        '0.19.0',
      ),
    );
  });

  it('resolves nothing when nothing is installed', () => {
    const home = homes.newHome();
    writeSettings(home, '{"model":"opus-4"}\n');
    writeInstalledPlugins(home, {});

    expect(resolve({ home }).pluginDir).toBeNull();
  });
});
