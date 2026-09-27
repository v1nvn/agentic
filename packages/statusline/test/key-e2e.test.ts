import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { catalog } from '../src/catalog.js';
import { configure } from '../src/configure.js';
import {
  capturePath,
  mainKeyValue,
  panelKeyValue,
  renderMjsPath,
} from '../src/resolve.js';
import {
  createHomes,
  keyArgv,
  settingsCommand,
  snapshotTree,
} from './fixtures.js';
import { DEFAULT_NOW, runRenderer } from './runtime.js';

const P1 = fileURLToPath(new URL('../assets/payloads/p1.json', import.meta.url));
const TICK = fileURLToPath(new URL('../assets/ticks/multi.json', import.meta.url));

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function runKey(
  key: string,
  home: string,
  stdin: string,
  extra: readonly string[] = [],
): { readonly status: number; readonly stdout: string } {
  const run = runRenderer([...keyArgv(key, home), ...extra], home, stdin);
  return { status: run.status, stdout: run.stdout };
}

describe('configure on a scratch home (rulings 1 and 4)', () => {
  it('holds exactly the two key values, writes nothing outside its footprint, and catalog stars follow the written variants', () => {
    const home = homes.newHome();

    configure({
      home,
      layout: '{model bar}',
      variants: { bar: 'gauge', model: 'block' },
    });

    expect(settingsCommand(home, 'statusLine')).toBe(
      mainKeyValue(null, '{model bar}', ['--model=block', '--bar=gauge']),
    );
    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue(null, []),
    );

    const written = Object.keys(snapshotTree(join(home, '.claude'))).sort();
    expect(written).toEqual([
      'plugins/data/statusline-agentic/backup.json',
      'plugins/data/statusline-agentic/render.mjs',
      'settings.json',
    ]);

    const lines = catalog({ home }).split('\n');
    expect(lines).toContain('model: plain | block* | pill | zen');
    expect(lines).toContain('bar: flat | gauge* | percent | none | flat6 | flat4');
  });

  it('a theme write carries the panel key too', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });

    expect(settingsCommand(home, 'subagentStatusLine')).toBe(
      panelKeyValue('quiet', []),
    );
  });
});

describe('a theme write through the real node renderer', () => {
  it('both --theme=lean keys paint lean — the line dots-separated with a percent bar, the panel row dots-separated with its context percent', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    const payload = readFileSync(P1, 'utf8');

    const mainKey = settingsCommand(home, 'statusLine');
    const panelKey = settingsCommand(home, 'subagentStatusLine');
    expect(mainKey).toBe(mainKeyValue('lean', null, []));
    expect(panelKey).toBe(panelKeyValue('lean', []));

    const line = runKey(mainKey, home, payload, [`--now=${DEFAULT_NOW}`]);

    expect(line.status).toBe(0);
    expect(line.stdout).toContain(' · ');
    expect(line.stdout).toContain('58%');
    expect(line.stdout).not.toContain('█');
    expect(line.stdout).not.toContain('│');
    expect(readFileSync(capturePath(home, 'main'))).toEqual(
      Buffer.from(payload),
    );

    const panel = runKey(panelKey, home, readFileSync(TICK, 'utf8'), [
      `--now=${DEFAULT_NOW}`,
    ]);

    expect(panel.status).toBe(0);
    const contents = panel.stdout
      .split('\n')
      .filter(row => row !== '')
      .map(row => (JSON.parse(row) as { content: string }).content);
    expect(
      contents.filter(
        content => content.includes(' · ') && content.includes('71%'),
      ),
    ).not.toEqual([]);
  });
});

describe('the written keys through the real node renderer (host-fact pin)', () => {
  it('the main key renders the piped payload and tees it byte-identical to captures/main.json', () => {
    const home = homes.newHome();
    configure({
      home,
      layout: '{model effort}',
      variants: { effort: 'dim', model: 'block' },
    });
    const stdin = readFileSync(P1, 'utf8');

    const painted = runKey(settingsCommand(home, 'statusLine'), home, stdin);

    expect(painted.status).toBe(0);
    expect(painted.stdout.trim(), 'rendered statusline line').not.toBe('');
    expect(readFileSync(capturePath(home, 'main'))).toEqual(
      Buffer.from(stdin),
    );
  });

  it('the panel key emits one JSON row per identified task', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });

    const painted = runKey(
      settingsCommand(home, 'subagentStatusLine'),
      home,
      readFileSync(TICK, 'utf8'),
    );

    expect(painted.status).toBe(0);
    const rows = painted.stdout.split('\n').filter(row => row !== '');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(() => JSON.parse(row)).not.toThrow();
    }
  });

  it('a home whose data dir lost render.mjs renders nothing and exits non-zero — the failure || true swallows', () => {
    const home = homes.newHome();
    configure({ home, theme: 'lean' });
    rmSync(renderMjsPath(home));
    expect(existsSync(renderMjsPath(home))).toBe(false);

    const swept = runKey(settingsCommand(home, 'statusLine'), home, '{}\n');

    expect(swept.status).not.toBe(0);
    expect(swept.stdout).toBe('');
  });
});
