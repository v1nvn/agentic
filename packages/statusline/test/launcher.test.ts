import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const LAUNCHER = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'render',
  'launcher.mjs',
);

const homes: string[] = [];

afterEach(() => {
  for (const home of homes) {
    rmSync(home, { recursive: true, force: true });
  }
  homes.length = 0;
});

function newHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'launcher-'));
  homes.push(home);
  return home;
}

function plantInstall(
  home: string,
  name: string,
  stamps: { installedAt: string; lastUpdated: string },
): {
  installPath: string;
  installedAt: string;
  lastUpdated: string;
  version: string;
} {
  const installPath = join(home, 'installs', name);
  mkdirSync(join(installPath, 'src', 'render'), { recursive: true });
  writeFileSync(
    join(installPath, 'src', 'render', 'entry.ts'),
    `process.stdout.write('rendered ${name}');\n`,
  );
  return { installPath, ...stamps, version: `1.0.0-${name}` };
}

function writeRecord(home: string, entries: readonly unknown[]): void {
  mkdirSync(join(home, '.claude', 'plugins'), { recursive: true });
  writeFileSync(
    join(home, '.claude', 'plugins', 'installed_plugins.json'),
    `${JSON.stringify({ plugins: { 'statusline@agentic': entries } }, null, 2)}\n`,
  );
}

describe('launcher install pick', () => {
  it('an equal lastUpdated tie falls to the later installedAt, matching resolveInstall', () => {
    const home = newHome();
    const sameUpdate = '2026-10-12T00:00:00.000Z';
    const a = plantInstall(home, 'a', {
      installedAt: '2026-10-10T00:00:00.000Z',
      lastUpdated: sameUpdate,
    });
    const b = plantInstall(home, 'b', {
      installedAt: '2026-10-12T00:00:00.000Z',
      lastUpdated: sameUpdate,
    });
    writeRecord(home, [a, b]);
    const run = spawnSync(process.execPath, [LAUNCHER], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe('rendered b');
  });
});
