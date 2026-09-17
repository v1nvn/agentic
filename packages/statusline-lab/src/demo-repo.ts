import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const NAME = 'Lab';
const EMAIL = 'lab@local';
const D_INIT = '2026-09-01T10:00:00+00:00';
const D_REMOTE = '2026-09-01T11:00:00+00:00';
const D_LOCAL1 = '2026-09-02T09:00:00+00:00';
const D_LOCAL2 = '2026-09-02T09:30:00+00:00';
const D_STASH = '2026-09-02T10:00:00+00:00';

const API_INIT = "export const api = {\n  host: 'demo.local',\n};\n";

/**
 * Materializes the demo git repo at `<home>/demo/atlas-web` — the
 * `current_dir` every shipped payload re-anchors to — and returns its path.
 * End state, byte-stable on any machine: branch `feature/login-flow`
 * (upstream `origin/main`, ahead 2, behind 1), 3 commits, 2 staged + 2
 * modified files, 5 untracked files, 1 stash. Identities and commit dates are
 * pinned, so every hash is reproducible.
 */
export function materializeDemoRepo(home: string): string {
  const dir = join(home, 'demo', 'atlas-web');
  for (const sub of ['src', 'docs', 'scratch', 'scripts']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  function git(args: string[], date?: string): string {
    return execFileSync('git', ['-c', 'commit.gpgsign=false', ...args], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        PATH: process.env.PATH ?? '',
        HOME: home,
        LC_ALL: 'C',
        TZ: 'UTC',
        GIT_AUTHOR_NAME: NAME,
        GIT_AUTHOR_EMAIL: EMAIL,
        GIT_COMMITTER_NAME: NAME,
        GIT_COMMITTER_EMAIL: EMAIL,
        ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
      },
    });
  }
  function write(rel: string, body: string): void {
    writeFileSync(join(dir, rel), body);
  }
  function commit(message: string, date: string): void {
    git(['add', '-A']);
    git(['commit', '-m', message], date);
  }

  git(['init', '-b', 'main']);
  git(['config', 'user.name', NAME]);
  git(['config', 'user.email', EMAIL]);
  write('README.md', 'atlas-web demo repo\n');
  write('src/index.js', 'export function start() {}\n');
  write('src/api.js', API_INIT);
  write('src/style.css', 'body { margin: 0; }\n');
  write('src/util.js', 'export const id = (x) => x;\n');
  commit('init', D_INIT);

  write('src/api.js', `${API_INIT}// remote: pinned host\n`);
  commit('remote1', D_REMOTE);
  const originMain = git(['rev-parse', 'HEAD']).trim();

  git(['checkout', '-b', 'feature/login-flow', 'HEAD~1']);
  write(
    'src/util.js',
    'export const id = (x) => x;\nexport const tag = (x) => x;\n',
  );
  commit('local1', D_LOCAL1);
  write('src/render.js', 'export function render() {}\n');
  commit('local2', D_LOCAL2);
  git(['update-ref', 'refs/remotes/origin/main', originMain]);
  git(['config', 'branch.feature/login-flow.remote', 'origin']);
  git(['config', 'branch.feature/login-flow.merge', 'refs/heads/main']);

  write('README.md', 'atlas-web demo repo (wip)\n');
  git(
    ['stash', 'push', '-m', 'wip: context refactor', '--', 'README.md'],
    D_STASH,
  );

  write('README.md', 'atlas-web demo repo\n\nstaged: pin the render loop\n');
  write(
    'src/index.js',
    'export function start() {\n  return Promise.resolve();\n}\n',
  );
  git(['add', 'README.md', 'src/index.js']);
  write('src/api.js', `${API_INIT}// local tweak\n`);
  write('src/style.css', 'body { margin: 0; padding: 0; }\n');
  write('docs/wip.txt', '');
  write('scratch/todo.md', '');
  write('scripts/deploy.sh', '');
  write('note1.md', '');
  write('note2.md', '');
  return dir;
}
