import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { resolveRuntime } from '../src/resolve.js';
import {
  RUNTIME_SOURCE,
  createHomes,
  installRuntime,
  writeSettings,
} from './fixtures.js';

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function writeInstalledPlugins(
  home: string,
  plugins: Readonly<Record<string, readonly { installPath: string }[]>>,
): void {
  const file = join(home, '.claude', 'plugins', 'installed_plugins.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ plugins }, null, 2)}\n`);
}

function copyRuntimeTo(dest: string): string {
  cpSync(RUNTIME_SOURCE, dest, { recursive: true });
  return dest;
}

describe('resolveRuntime', () => {
  it('resolves the newest cache version, version-sorted not lexicographic', () => {
    const home = homes.newHome();
    installRuntime(home, '0.9.0');
    installRuntime(home, '0.10.0');
    const newest = installRuntime(home, '0.19.0');

    // 0.9.0 wins lexicographically; only a version sort picks 0.19.0.
    expect(resolveRuntime({ home }).dir).toBe(newest);
  });

  it('prefers the installPath named by installed_plugins.json over newer cache versions', () => {
    const home = homes.newHome();
    writeSettings(home, '{"model":"opus-4"}\n');
    installRuntime(home, '0.19.0');
    const installed = copyRuntimeTo(
      join(home, '.claude', 'plugins', 'store', 'statusline-0.18.0', 'runtime'),
    );
    writeInstalledPlugins(home, {
      'statusline-lab@agentic': [{ installPath: dirname(installed) }],
    });

    expect(resolveRuntime({ home }).dir).toBe(installed);
  });

  it('throws the install hint when nothing resolves', () => {
    const home = homes.newHome();
    writeSettings(home, '{"model":"opus-4"}\n');
    writeInstalledPlugins(home, {});

    expect(() => resolveRuntime({ home })).toThrowError(/install/);
    expect(() => resolveRuntime({ home })).toThrowError(/statusline-lab/);
  });

  it('reads the menu and default layout off the resolved runtime', () => {
    const home = homes.newHome();
    installRuntime(home);

    const runtime = resolveRuntime({ home });
    const comps = /^COMPS="(.+)"$/m.exec(
      readFileSync(join(RUNTIME_SOURCE, 'statusline.sh'), 'utf8'),
    )?.[1];
    const layout = /^export DEFAULT_LAYOUT='(.*)'$/m.exec(
      readFileSync(join(RUNTIME_SOURCE, 'lib.sh'), 'utf8'),
    )?.[1];
    expect(comps).toBeDefined();
    expect(layout).toBeDefined();

    expect(runtime.items.map(item => item.item)).toEqual(comps?.split(' '));
    expect(
      runtime.items.find(item => item.item === 'model')?.alternatives,
    ).toEqual(['plain', 'block', 'pill', 'zen']);
    expect(runtime.defaultLayout).toBe(layout);
  });
});
