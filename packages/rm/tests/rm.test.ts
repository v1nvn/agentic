import { expect, test } from 'claude-code/testing';

import { stubEngine } from './stub.ts';

import type { CommandRunResult } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const SENT = 'Sent: A_heading.epub → remarkable:/home/root/books';

/** The unreachable-device shape: pandoc made the EPUB, ssh could not resolve the host. */
const SSH_FAILED =
  'ssh failed: ssh: Could not resolve hostname remarkable: nodename nor servname provided, or not known';

async function startSession($: Engine): Promise<void> {
  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
}

async function runSend($: Engine): Promise<CommandRunResult> {
  return $.command.run({
    command: 'rm-send',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
}

test('session start declaratively registers rm-send, execs and draws nothing', async ($, on) => {
  const world = stubEngine(on, { stdout: `${SENT}\n` });

  await startSession($);
  expect(world.registered).toEqual(['rm-send']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('a run execs the shipped CLI, reports its stdout as one dim line, answers nothing', async ($, on) => {
  const world = stubEngine(on, { stdout: `${SENT}\n` });
  await startSession($);

  const answer = await runSend($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts$/),
  ]);
  expect(world.logs).toEqual([SENT]);
});

test('a refused exec reports the refusal, answers nothing, no crash', async ($, on) => {
  const world = stubEngine(on, { deny: 'permission denied by the user' });
  await startSession($);

  const answer = await runSend($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
});

test('a failed beam reports its failing stage, not the bare fallback', async ($, on) => {
  const world = stubEngine(on, { stderr: SSH_FAILED, stdout: '' });
  await startSession($);

  const answer = await runSend($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([SSH_FAILED]);
});
