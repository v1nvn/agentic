import { existsSync, readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { configure } from '../src/configure.js';
import { capturePath } from '../src/resolve.js';
import {
  createHomes,
  keyArgv,
  plantRendererRecord,
  settingsCommand,
  tmpFilesUnder,
} from './fixtures.js';
import { runRenderer, tickStdin } from './runtime.js';

// Both tees live in the entry the keys spawn — these run the real node
// renderer the way the host shell does. The main surface's tee is pinned in
// key-e2e; here the panel door carries the same contract.
const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function runPanel(home: string, stdin: string): number {
  return runRenderer(
    keyArgv(settingsCommand(home, 'subagentStatusLine'), home),
    home,
    stdin,
  ).status;
}

describe('the capture tee', () => {
  it('a piped tick lands byte-identical in captures/tick.json', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });
    plantRendererRecord(home, {
      lastUpdated: '2026-01-01T00:00:00Z',
      version: '1.2.3',
    });
    const stdin = tickStdin();

    const status = runPanel(home, stdin);

    expect(status).toBe(0);
    const capture = capturePath(home, 'tick');
    expect(existsSync(capture), capture).toBe(true);
    expect(readFileSync(capture)).toEqual(Buffer.from(stdin));
    expect(tmpFilesUnder(home)).toEqual([]);
  });

  it('a later render replaces the capture with the newer tick', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });
    plantRendererRecord(home, {
      lastUpdated: '2026-01-01T00:00:00Z',
      version: '1.2.3',
    });
    runPanel(home, tickStdin());
    const second = `${JSON.stringify({ columns: 80, tasks: [] }, null, 2)}\n`;

    runPanel(home, second);

    expect(readFileSync(capturePath(home, 'tick'))).toEqual(
      Buffer.from(second),
    );
    expect(tmpFilesUnder(home)).toEqual([]);
  });

  it('an unparseable tick is captured whole before the parse fails — no partial capture', () => {
    const home = homes.newHome();
    configure({ home, theme: 'quiet' });
    plantRendererRecord(home, {
      lastUpdated: '2026-01-01T00:00:00Z',
      version: '1.2.3',
    });
    const garbage = '{not json\n';

    const status = runPanel(home, garbage);

    expect(status).not.toBe(0);
    expect(readFileSync(capturePath(home, 'tick'))).toEqual(
      Buffer.from(garbage),
    );
    expect(tmpFilesUnder(home)).toEqual([]);
  });
});
