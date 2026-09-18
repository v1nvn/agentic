import { execFileSync } from 'node:child_process';
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

function runGit(home: string, repoDir: string, args: string[]): string {
  return execFileSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '',
      HOME: home,
      LC_ALL: 'C',
      TZ: 'UTC',
    },
  });
}

describe('demo repo', () => {
  it('materializes the pinned demo state', () => {
    if (!demo) {
      throw new Error('demo home not materialized');
    }
    const porcelain = runGit(demo.home, demo.repoDir, [
      'status',
      '--porcelain=v2',
      '--branch',
    ]).split('\n');
    const entries = porcelain.filter(line => /^[12] /.test(line));
    const staged = entries.filter(line => line[2] !== '.').length;
    const modified = entries.filter(line => line[3] !== '.').length;
    const untracked = porcelain.filter(line => line.startsWith('? ')).length;
    expect(porcelain.find(line => line.startsWith('# branch.head'))).toBe(
      '# branch.head feature/login-flow',
    );
    expect(porcelain.find(line => line.startsWith('# branch.upstream'))).toBe(
      '# branch.upstream origin/main',
    );
    expect(porcelain.find(line => line.startsWith('# branch.ab'))).toBe(
      '# branch.ab +2 -1',
    );
    expect(staged).toBe(2);
    expect(modified).toBe(2);
    expect(untracked).toBe(5);
    expect(
      runGit(demo.home, demo.repoDir, ['rev-list', '--count', 'HEAD']).trim(),
    ).toBe('3');
    expect(
      runGit(demo.home, demo.repoDir, ['stash', 'list']).trim().split('\n'),
    ).toHaveLength(1);
    const head = runGit(demo.home, demo.repoDir, ['rev-parse', 'HEAD']).trim();
    const other = createDemoHome();
    try {
      expect(
        runGit(other.home, other.repoDir, ['rev-parse', 'HEAD']).trim(),
      ).toBe(head);
    } finally {
      rmSync(other.home, { recursive: true, force: true });
    }
  });
});

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

describe('ramped picks', () => {
  it.each(['bar=gauge', 'cache=fuse', 'rate=strip'])(
    '%s in the picks file renders without a warn',
    pick => {
      const run = render('p1', { picks: `${pick}\n` });
      expect(run.status).toBe(0);
      expect(run.stderr).toBe('');
      expect(run.stdout.equals(golden('p1-default'))).toBe(false);
    },
  );
});

describe('unknown picks', () => {
  it('model=nope in the picks file warns and falls back to the default line', () => {
    const run = render('p1', { picks: 'model=nope\n' });
    expect(run.status).toBe(0);
    expect(run.stderr.trim()).not.toBe('');
    expect(run.stdout).toEqual(golden('p1-default'));
  });
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
