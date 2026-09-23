import { existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  RUNTIME_COMPONENTS_DIR,
  RUNTIME_LIB,
  RUNTIME_MAIN,
  RUNTIME_SUBAGENT,
  payloadStdin,
  spawnRuntime,
} from './plugin-runtime.js';
import {
  createDemoHome,
  golden,
  type DemoHome,
  type RenderResult,
} from './runtime.js';

const OLD_BIN_DIR = fileURLToPath(
  new URL('../../../plugins/statusline/bin', import.meta.url),
);
const OLD_COMPONENTS_DIR = fileURLToPath(
  new URL('../../../plugins/statusline/components', import.meta.url),
);

const ANSI = /\x1b\[[0-9;]*m/g;
const stripAnsi = (line: string) => line.replace(ANSI, '');
const linesOf = (stdout: Buffer) =>
  stdout.toString('utf8').replace(/\n$/, '').split('\n');

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

function renderMain(
  env: Readonly<Record<string, string>> = {},
): RenderResult {
  if (!demo) {
    throw new Error('demo home not materialized');
  }
  return spawnRuntime({
    script: RUNTIME_MAIN,
    stdin: payloadStdin(demo.repoDir),
    home: demo.home,
    env,
  });
}

describe('runtime location (contract 6)', () => {
  it('statusline.sh, subagent.sh and lib.sh live under runtime/', () => {
    expect(existsSync(RUNTIME_MAIN), RUNTIME_MAIN).toBe(true);
    expect(existsSync(RUNTIME_SUBAGENT), RUNTIME_SUBAGENT).toBe(true);
    expect(existsSync(RUNTIME_LIB), RUNTIME_LIB).toBe(true);
  });

  it('the component scripts live under runtime/components/', () => {
    const names = existsSync(RUNTIME_COMPONENTS_DIR)
      ? readdirSync(RUNTIME_COMPONENTS_DIR)
      : [];
    for (const item of ['model', 'bar', 'style', 'cwd', 'branch']) {
      expect(
        names,
        `${item}.sh under runtime/components/`,
      ).toContain(`${item}.sh`);
    }
  });

  it('the old bin/ and components/ directories are gone', () => {
    expect(existsSync(OLD_BIN_DIR), OLD_BIN_DIR).toBe(false);
    expect(existsSync(OLD_COMPONENTS_DIR), OLD_COMPONENTS_DIR).toBe(false);
  });
});

describe('env var config (contract 5)', () => {
  it('STATUSLINE_LAB_MODEL=block renders the block variant', () => {
    const run = renderMain({ STATUSLINE_LAB_MODEL: 'block' });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout.equals(golden('p1-default'))).toBe(false);
    expect(run.stdout.toString('utf8')).toContain('\x1b[48;5;61m');
  });

  it('STATUSLINE_LAB_BAR=gauge renders the gauge variant', () => {
    const run = renderMain({ STATUSLINE_LAB_BAR: 'gauge' });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout.equals(golden('p1-default'))).toBe(false);
    expect(run.stdout.toString('utf8')).toContain('\x1b[38;2;68;71;90m');
  });

  it('STATUSLINE_LAB_STYLE=dots swaps the separators', () => {
    const run = renderMain({ STATUSLINE_LAB_STYLE: 'dots' });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    const plain = stripAnsi(run.stdout.toString('utf8'));
    expect(plain).toContain(' · ');
    expect(plain).not.toContain(' │ ');
    expect(run.stdout.equals(golden('p1-default'))).toBe(false);
  });
});

describe('layout grammar (contract 4)', () => {
  it('no layout set renders the default composition byte-identically', () => {
    const run = renderMain();
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout).toEqual(golden('p1-default'));
  });

  it('an empty layout renders the default composition', () => {
    const run = renderMain({ STATUSLINE_LAB_LAYOUT: '' });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    expect(run.stdout).toEqual(golden('p1-default'));
  });

  it('a custom layout reorders and restricts the composition', () => {
    const run = renderMain({
      STATUSLINE_LAB_LAYOUT: '{cwd branch} {model effort}',
    });
    expect(run.status).toBe(0);
    expect(run.stderr).toBe('');
    const lines = linesOf(run.stdout);
    expect(lines).toHaveLength(1);
    const plain = stripAnsi(lines[0]);
    expect(plain).toContain('~/d/atlas-web');
    expect(plain).toContain('f/login-flow');
    expect(plain).toContain('Opus');
    for (const absent of [
      '116.8k/200k',
      '$3.87',
      '82m05s',
      '⚡',
      '+2',
      '█',
    ]) {
      expect(plain, `restricted layout must not render ${absent}`).not.toContain(
        absent,
      );
    }
    expect(plain.indexOf('~/d/atlas-web')).toBeLessThan(plain.indexOf('Opus'));
  });

  it('an unknown item id is skipped with a warning and the render succeeds', () => {
    const run = renderMain({
      STATUSLINE_LAB_LAYOUT: '{cwd bogusitem} {model effort}',
    });
    expect(run.status).toBe(0);
    expect(run.stderr).toContain('bogusitem');
    const plain = stripAnsi(run.stdout.toString('utf8'));
    expect(plain).toContain('~/d/atlas-web');
    expect(plain).toContain('Opus');
  });
});

describe('the paint path never crashes (contract 6)', () => {
  it.each([
    ['STATUSLINE_LAB_MODEL', 'nonsense'],
    ['STATUSLINE_LAB_BAR', 'nonsense'],
  ])('%s=%s falls back to the default line with a stderr warning', (
    key,
    value,
  ) => {
    const run = renderMain({ [key]: value });
    expect(run.status).toBe(0);
    expect(run.stderr.trim()).not.toBe('');
    expect(run.stdout).toEqual(golden('p1-default'));
  });
});
