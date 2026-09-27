import { existsSync, readFileSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderPanel } from '../src/render/panel.js';
import { capturePath } from '../src/resolve.js';
import { createHomes, tmpFilesUnder } from './fixtures.js';
import { tickStdin } from './runtime.js';

// The line-mode tee lives in the entry the keys spawn; key-e2e pins it through
// the real node renderer. Here the panel door carries the same contract.
const homes = createHomes();

let home: string;

beforeEach(() => {
  home = homes.newHome();
});

afterEach(() => {
  homes.dispose();
});

describe('the capture tee', () => {
  it('a piped tick lands byte-identical in captures/tick.json', () => {
    const stdin = tickStdin();
    renderPanel({ home, now: 0, payload: stdin });

    const capture = capturePath(home, 'tick');
    expect(existsSync(capture), capture).toBe(true);
    expect(readFileSync(capture)).toEqual(Buffer.from(stdin));
    expect(tmpFilesUnder(home)).toEqual([]);
  });

  it('a later render replaces the capture with the newer tick', () => {
    renderPanel({ home, now: 0, payload: tickStdin() });
    const second = `${JSON.stringify(
      { columns: 80, tasks: [] },
      null,
      2,
    )}\n`;
    renderPanel({ home, now: 0, payload: second });

    expect(readFileSync(capturePath(home, 'tick'))).toEqual(
      Buffer.from(second),
    );
    expect(tmpFilesUnder(home)).toEqual([]);
  });

  it('an unparseable tick is captured whole before the parse fails — no partial capture', () => {
    const garbage = '{not json\n';
    expect(() =>
      renderPanel({ home, now: 0, payload: garbage }),
    ).toThrowError();

    expect(readFileSync(capturePath(home, 'tick'))).toEqual(
      Buffer.from(garbage),
    );
    expect(tmpFilesUnder(home)).toEqual([]);
  });
});
