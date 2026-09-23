import { existsSync, readFileSync, rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  RUNTIME_MAIN,
  RUNTIME_SUBAGENT,
  capturePath,
  payloadStdin,
  spawnRuntime,
  tickStdin,
  tmpFilesUnder,
} from './plugin-runtime.js';
import { createDemoHome, type DemoHome } from './runtime.js';

let demo: DemoHome | undefined;

beforeEach(() => {
  demo = createDemoHome();
});

afterEach(() => {
  if (demo) {
    rmSync(demo.home, { recursive: true, force: true });
    demo = undefined;
  }
});

function currentDemo(): DemoHome {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  return demo;
}

describe('the runtime tee (contract 7)', () => {
  it('a piped payload lands byte-identical in captures/main.json', () => {
    const d = currentDemo();
    const stdin = payloadStdin(d.repoDir);
    const run = spawnRuntime({
      script: RUNTIME_MAIN,
      stdin,
      home: d.home,
    });
    expect(run.status).toBe(0);
    const capture = capturePath(d.home, 'main');
    expect(existsSync(capture), capture).toBe(true);
    expect(readFileSync(capture)).toEqual(Buffer.from(stdin));
    expect(tmpFilesUnder(d.home)).toEqual([]);
  });

  it('a piped tick lands byte-identical in captures/tick.json', () => {
    const d = currentDemo();
    const stdin = tickStdin();
    const run = spawnRuntime({
      script: RUNTIME_SUBAGENT,
      stdin,
      home: d.home,
    });
    expect(run.status).toBe(0);
    const capture = capturePath(d.home, 'tick');
    expect(existsSync(capture), capture).toBe(true);
    expect(readFileSync(capture)).toEqual(Buffer.from(stdin));
    expect(tmpFilesUnder(d.home)).toEqual([]);
  });

  it('a later render replaces the capture with the newer payload', () => {
    const d = currentDemo();
    spawnRuntime({
      script: RUNTIME_MAIN,
      stdin: payloadStdin(d.repoDir, 'p1'),
      home: d.home,
    });
    spawnRuntime({
      script: RUNTIME_MAIN,
      stdin: payloadStdin(d.repoDir, 'p3'),
      home: d.home,
    });
    expect(readFileSync(capturePath(d.home, 'main'))).toEqual(
      Buffer.from(payloadStdin(d.repoDir, 'p3')),
    );
    expect(tmpFilesUnder(d.home)).toEqual([]);
  });

  it.each(['main', 'tick'])(
    'invalid JSON into %s renders without crashing and leaves no partial capture',
    surface => {
      const d = currentDemo();
      const script = surface === 'main' ? RUNTIME_MAIN : RUNTIME_SUBAGENT;
      const run = spawnRuntime({
        script,
        stdin: '{not json\n',
        home: d.home,
      });
      expect(run.status).toBe(0);
      expect(tmpFilesUnder(d.home)).toEqual([]);
    },
  );
});
