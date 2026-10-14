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
import { describe, expect, it } from 'vitest';

import { readGit } from '../src/render/git.ts';

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

    // A stale cached stat is what tempts `git status` into rewriting the
    // index — the state of every repo the statusline polls while its
    // session is editing files and about to commit.
    utimesSync(join(dir, 'tracked.txt'), new Date(0), new Date(0));
    const index = join(dir, '.git', 'index');
    const before = statSync(index);

    readGit(dir, { home });

    // A rewrite lands by renaming a fresh .git/index.lock over the index,
    // so a replaced index is a new inode — an mtime alone could tie.
    const after = statSync(index);
    expect([after.ino, after.mtimeMs]).toEqual([before.ino, before.mtimeMs]);
  });
});
