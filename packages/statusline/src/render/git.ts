import { spawnSync } from 'node:child_process';

import { stripControls } from './payload.ts';

export interface GitFacts {
  readonly ahead: number;
  readonly behind: number;
  readonly branch: string;
  readonly modified: number;
  readonly staged: number;
  readonly stashes: number;
  readonly untracked: number;
}

export interface GitEnv {
  readonly home: string;
}

const BRANCH_HEAD = '# branch.head ';
// `# branch.ab +2 -3` rides the porcelain status only when an upstream
// exists — absent lines read as the zeros a failed rev-list counted.
const BRANCH_AB = /^# branch\.ab \+(\d+) -(\d+)$/;

function gitEnv(env: GitEnv): Readonly<Record<string, string>> {
  return {
    // `git status` otherwise rewrites the index under .git/index.lock to
    // refresh stale stat info, racing the user's own git add/commit.
    GIT_OPTIONAL_LOCKS: '0',
    HOME: env.home,
    LC_ALL: 'C',
    PATH: process.env.PATH ?? '',
  };
}

function gitText(
  dir: string,
  args: readonly string[],
  env: GitEnv,
): null | string {
  const run = spawnSync('git', ['-C', dir, ...args], {
    encoding: 'utf8',
    env: gitEnv(env),
  });
  return run.status === 0 ? run.stdout : null;
}

function lineCount(text: null | string): number {
  return text === null || text === '' ? 0 : (text.match(/\n/g) ?? []).length;
}

function count(text: null | string): number {
  const parsed = text === null ? NaN : Number(text.trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

export function unmeasuredFacts(): GitFacts {
  return {
    ahead: 0,
    behind: 0,
    branch: '',
    modified: 0,
    staged: 0,
    stashes: 0,
    untracked: 0,
  };
}

export function readGit(dir: string, env: GitEnv): GitFacts {
  if (dir === '') {
    return unmeasuredFacts();
  }
  const probe = spawnSync('git', ['-C', dir, 'rev-parse', '--git-dir'], {
    encoding: 'utf8',
    env: gitEnv(env),
  });
  if (probe.status !== 0) {
    return unmeasuredFacts();
  }
  let branch = '';
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let modified = 0;
  let untracked = 0;
  const status = gitText(
    dir,
    ['status', '--porcelain=v2', '--branch', '-uall'],
    env,
  );
  for (const line of (status ?? '').split('\n')) {
    if (line.startsWith(BRANCH_HEAD)) {
      branch = stripControls(line.slice(BRANCH_HEAD.length));
      continue;
    }
    const ab = BRANCH_AB.exec(line);
    if (ab !== null) {
      ahead = count(ab[1]);
      behind = count(ab[2]);
    } else if (
      (line.startsWith('1 ') || line.startsWith('2 ')) &&
      line.length >= 4
    ) {
      if (line[2] !== '.') {
        staged += 1;
      }
      if (line[3] !== '.') {
        modified += 1;
      }
    } else if (line.startsWith('? ')) {
      untracked += 1;
    }
  }
  return {
    ahead,
    behind,
    branch: branch === '(detached)' ? '' : branch,
    modified,
    staged,
    stashes: lineCount(gitText(dir, ['stash', 'list'], env)),
    untracked,
  };
}
