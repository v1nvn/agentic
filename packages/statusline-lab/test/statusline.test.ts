import { rmSync } from 'node:fs';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  NOW_AFTER_CACHE_EXPIRY,
  NOW_BEFORE_CACHE_EXPIRY,
  createDemoHome,
  golden,
  renderStatusline,
  type DemoHome,
} from './runtime.js';

// Goldens are byte captures of the reference lab compose.sh (the shipped
// default picks forced through argv) run under the same contract as
// renderStatusline: bash plugins/statusline/bin/statusline.sh, payload stdin
// re-anchored to the demo repo, env HOME/NOW/LC_ALL=C/TZ=UTC pinned.

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

function render(
  payload: string,
  options: { now?: string; picks?: string } = {},
) {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  return renderStatusline({
    payload,
    home: demo.home,
    repoDir: demo.repoDir,
    ...options,
  });
}

describe('per-fixture goldens', () => {
  it.each(['p1', 'p2', 'p3', 'p4'])(
    'renders %s as one deterministic line',
    payload => {
      const run = render(payload);
      expect(run.status).toBe(0);
      expect(run.stdout).toEqual(golden(`${payload}-default`));
      expect(run.stdout.toString('utf8').split('\n')).toHaveLength(2);
    },
  );
});

describe('determinism', () => {
  it('two fresh demo homes render identical bytes', () => {
    const first = render('p1');
    const second = createDemoHome();
    try {
      const again = renderStatusline({
        payload: 'p1',
        home: second.home,
        repoDir: second.repoDir,
      });
      expect(again.status).toBe(0);
      expect(again.stdout).toEqual(first.stdout);
    } finally {
      rmSync(second.home, { recursive: true, force: true });
    }
    expect(first.stdout).toEqual(golden('p1-default'));
  });
});

describe('picks from the data dir', () => {
  it('a differing visible pick restyles the line', () => {
    const restyled = render('p1', { picks: 'style=dots\n' });
    expect(restyled.status).toBe(0);
    expect(restyled.stdout.equals(golden('p1-default'))).toBe(false);
    expect(restyled.stdout).toEqual(golden('p1-style-dots'));
  });
});

describe('not-adoptable picks', () => {
  it.each(['bar=gauge', 'cache=fuse', 'rate=strip', 'model=nope'])(
    '%s in the picks file warns and falls back to the default line',
    pick => {
      const run = render('p1', { picks: `${pick}\n` });
      expect(run.status).toBe(0);
      expect(run.stderr.trim()).not.toBe('');
      expect(run.stdout).toEqual(golden('p1-default'));
    },
  );
});

describe('NOW sensitivity', () => {
  it('cache=coldin shifts as NOW crosses the fixture expiry', () => {
    const before = render('p1', {
      now: NOW_BEFORE_CACHE_EXPIRY,
      picks: 'cache=coldin\n',
    });
    const after = render('p1', {
      now: NOW_AFTER_CACHE_EXPIRY,
      picks: 'cache=coldin\n',
    });
    expect(before.status).toBe(0);
    expect(after.status).toBe(0);
    expect(after.stdout.equals(before.stdout)).toBe(false);
    expect(before.stdout).toEqual(golden('p1-coldin-warm'));
    expect(after.stdout).toEqual(golden('p1-coldin-cold'));
  });
});
