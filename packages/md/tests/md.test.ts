import { expect, test } from 'claude-code/testing';

import { stubEngine } from './stub.ts';

import type { CommandRunResult } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const SENT = 'Opened in Markdown-Viewer (link copied).';

/** The fresh-project shape: the CLI found no transcript to share. */
const NO_REPLY =
  'no session transcript found in /Users/v1n/.claude/projects/-work';

async function startSession($: Engine): Promise<void> {
  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
}

async function run(
  $: Engine,
  command: 'md-edit' | 'md-view',
): Promise<CommandRunResult> {
  return $.command.run({
    command,
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
}

test('session start declaratively registers md-edit and md-view, execs and draws nothing', async ($, on) => {
  const world = stubEngine(on, { stdout: `${SENT}\n` });

  await startSession($);
  expect(world.registered).toEqual(['md-edit', 'md-view']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('an md-edit run execs the CLI plain, reports its stdout as one dim line, answers nothing', async ($, on) => {
  const world = stubEngine(on, { stdout: `${SENT}\n` });
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts$/),
  ]);
  expect(world.logs).toEqual([SENT]);
});

test('an md-view run adds the --view flag — the two commands are distinct exec lines', async ($, on) => {
  const world = stubEngine(on, { stdout: `${SENT}\n` });
  await startSession($);

  await run($, 'md-edit');
  const answer = await run($, 'md-view');
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts$/),
    expect.stringMatching(/^node .*\/src\/index\.ts --view$/),
  ]);
  expect(world.logs).toEqual([SENT, SENT]);
});

test('a refused exec reports the refusal, answers nothing, no crash', async ($, on) => {
  const world = stubEngine(on, { deny: 'permission denied by the user' });
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
});

test('a failed share reports its reason, not the bare fallback', async ($, on) => {
  const world = stubEngine(on, { stderr: NO_REPLY, stdout: '' });
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([NO_REPLY]);
});
