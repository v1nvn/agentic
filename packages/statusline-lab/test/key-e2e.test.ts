import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { configure } from '../src/configure.js';
import {
  createHomes,
  installRuntime,
  mainKeyValue,
  settingsCommand,
  snapshotTree,
  subagentKeyValue,
} from './fixtures.js';
import { capturePath } from './plugin-runtime.js';

const P1 = fileURLToPath(new URL('../assets/payloads/p1.json', import.meta.url));

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function newInstalledHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

function bashKey(key: string, home: string) {
  return spawnSync('bash', ['-c', key], {
    env: {
      HOME: home,
      LC_ALL: 'C',
      PATH: process.env.PATH ?? '',
      TZ: 'UTC',
    },
    input: readFileSync(P1),
    timeout: 30_000,
  });
}

describe('configure on a scratch home (rulings 1 and 4)', () => {
  it('holds exactly the two key values, writes no script files anywhere, and catalog stars follow the written variants', () => {
    const home = newInstalledHome();

    configure({
      home,
      layout: '{model bar}',
      variants: { bar: 'gauge', model: 'block' },
    });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue('{model bar}', [
        'STATUSLINE_LAB_MODEL=block',
        'STATUSLINE_LAB_BAR=gauge',
      ]),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(subagentKeyValue);

    const written = Object.keys(snapshotTree(join(home, '.claude'))).sort();
    expect(written).toContain('settings.json');
    for (const path of written) {
      expect(
        path === 'settings.json' || path.startsWith('plugins/cache/'),
        `configure wrote outside the two-key footprint: ${path}`,
      ).toBe(true);
    }

    const lines = catalog({ home }).split('\n');
    expect(lines).toContain('model: plain | block* | pill | zen');
    expect(lines).toContain('bar: flat | gauge* | percent | none');
  });
});

describe('the written main key in a real shell (host-fact pin)', () => {
  it('renders the piped payload on stdout and tees captures/main.json; an empty cache dir yields empty stdout and exit 0', () => {
    const home = newInstalledHome();
    configure({
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });
    const key = settingsCommand(home, 'statusLine');

    const painted = bashKey(key, home);
    expect(painted.status).toBe(0);
    expect(
      painted.stdout.toString('utf8').trim(),
      'rendered statusline line',
    ).not.toBe('');
    expect(existsSync(capturePath(home, 'main')), 'captures/main.json').toBe(
      true,
    );

    const sweptHome = homes.newHome();
    mkdirSync(
      join(sweptHome, '.claude', 'plugins', 'cache', 'agentic', 'statusline-lab'),
      { recursive: true },
    );
    const swept = bashKey(key, sweptHome);
    expect(swept.status).toBe(0);
    expect(swept.stdout.toString('utf8')).toBe('');
  });
});
