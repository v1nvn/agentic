import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { materializeDemoRepo } from '../src/demo-repo.ts';
import { renderStatusline } from '../src/render/engine.ts';
import { readGit } from '../src/render/git.ts';

const spawns = vi.hoisted(() => ({
  args: [] as string[],
  names: [] as string[],
}));

vi.mock('node:child_process', async importOriginal => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawnSync: (...args: Parameters<typeof actual.spawnSync>) => {
      spawns.names.push(String(args[0]));
      spawns.args.push(String(args[1]?.join(' ') ?? ''));
      return actual.spawnSync(...args);
    },
  };
});

function makeRepo(home: string): string {
  const dir = join(home, 'repo');
  mkdirSync(dir);
  const git = (args: string[]) =>
    execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
      cwd: dir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PATH: process.env.PATH ?? '',
        HOME: home,
        LC_ALL: 'C',
        GIT_AUTHOR_NAME: 't',
        GIT_AUTHOR_EMAIL: 't@example.com',
        GIT_COMMITTER_NAME: 't',
        GIT_COMMITTER_EMAIL: 't@example.com',
      },
    });
  git(['init', '--quiet', '-b', 'main']);
  writeFileSync(join(dir, 'tracked.txt'), 'content\n');
  git(['add', 'tracked.txt']);
  git(['commit', '--quiet', '-m', 'init']);
  return dir;
}

describe('readGit', () => {
  it('reading facts never rewrites the index', () => {
    const home = mkdtempSync(join(tmpdir(), 'statusline-locks-'));
    const dir = makeRepo(home);

    // A stale cached stat tempts `git status` into rewriting the index.
    utimesSync(join(dir, 'tracked.txt'), new Date(0), new Date(0));
    const index = join(dir, '.git', 'index');
    const before = statSync(index);

    readGit(dir, { home }, false);

    // A rewrite lands by renaming a fresh .git/index.lock over the index,
    // so a replaced index is a new inode — an mtime alone could tie.
    const after = statSync(index);
    expect([after.ino, after.mtimeMs]).toEqual([before.ino, before.mtimeMs]);
  });

  it('untracked counts match ls-files on the dirty demo repo', () => {
    const home = mkdtempSync(join(tmpdir(), 'statusline-parity-'));
    const dir = materializeDemoRepo(home);
    writeFileSync(join(dir, 'docs', 'extra1.md'), '');
    writeFileSync(join(dir, 'docs', 'extra2.md'), '');
    const nested = join(dir, 'nested-clone');
    mkdirSync(nested);
    execFileSync('git', ['init', '--quiet'], { cwd: nested });

    const facts = readGit(dir, { home }, false);
    const others = execFileSync(
      'git',
      ['-C', dir, 'ls-files', '--others', '--exclude-standard'],
      { encoding: 'utf8' },
    );
    const lines = others.trimEnd();
    const expected = lines === '' ? 0 : lines.split('\n').length;
    expect(facts.untracked).toBe(expected);
    // -unormal would collapse the extras' directory; -uall reads 8 — a
    // nested clone counts once here, as it does for ls-files.
    expect(facts.untracked).toBe(8);
  });

  it('a quiet-theme paint performs zero git spawns', () => {
    const home = mkdtempSync(join(tmpdir(), 'statusline-quiet-'));
    const dir = makeRepo(home);
    const payload = `${JSON.stringify({ workspace: { current_dir: dir } })}\n`;

    spawns.names.length = 0;
    renderStatusline({
      home,
      now: 0,
      payload,
      layout: '{model cwd}',
      picks: { cwd: 'tail', model: 'zen', style: 'bare' },
      noColor: true,
    });
    expect(spawns.names).toEqual([]);

    spawns.names.length = 0;
    renderStatusline({ home, now: 0, payload });
    expect(spawns.names).toContain('git');
    expect(spawns.args.some(argv => argv.includes('stash'))).toBe(false);

    spawns.names.length = 0;
    spawns.args.length = 0;
    renderStatusline({ home, now: 0, payload, picks: { status: 'icons' } });
    expect(spawns.args.some(argv => argv.includes('stash'))).toBe(true);
  });
});
