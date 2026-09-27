import { spawnSync } from 'node:child_process';

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

function gitEnv(env: GitEnv): Readonly<Record<string, string>> {
  return {
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

export function readGit(dir: string, env: GitEnv): GitFacts {
  const facts = {
    ahead: 0,
    behind: 0,
    branch: '',
    modified: 0,
    staged: 0,
    stashes: 0,
    untracked: 0,
  };
  if (dir === '') {
    return facts;
  }
  const probe = spawnSync('git', ['-C', dir, 'rev-parse', '--git-dir'], {
    encoding: 'utf8',
    env: gitEnv(env),
  });
  if (probe.status !== 0) {
    return facts;
  }
  const status = gitText(dir, ['status', '--porcelain=v2', '--branch'], env);
  for (const line of (status ?? '').split('\n')) {
    if (line.startsWith(BRANCH_HEAD)) {
      facts.branch = line.slice(BRANCH_HEAD.length);
    } else if (
      (line.startsWith('1 ') || line.startsWith('2 ')) &&
      line.length >= 4
    ) {
      if (line[2] !== '.') {
        facts.staged += 1;
      }
      if (line[3] !== '.') {
        facts.modified += 1;
      }
    }
  }
  if (facts.branch === '(detached)') {
    facts.branch = '';
  }
  facts.ahead = count(gitText(dir, ['rev-list', '--count', '@{u}..HEAD'], env));
  facts.behind = count(
    gitText(dir, ['rev-list', '--count', 'HEAD..@{u}'], env),
  );
  facts.untracked = lineCount(
    gitText(dir, ['ls-files', '--others', '--exclude-standard'], env),
  );
  facts.stashes = lineCount(gitText(dir, ['stash', 'list'], env));
  return facts;
}
