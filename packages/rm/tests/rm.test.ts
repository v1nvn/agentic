import { expect, test } from 'claude-code/testing';

import type { CommandRunResult, On } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const SENT = 'Sent: A_heading.epub → remarkable:/home/root/books';

type World = {
  commands: string[];
  logs: string[];
  opens: string[];
  registered: string[];
};

function stubWorld(on: On, answer: 'refuse' | 'sent' = 'sent'): World {
  const world: World = {
    commands: [],
    logs: [],
    opens: [],
    registered: [],
  };
  on('command.register', ($, e) => {
    world.registered.push(e.name);
    return { value: { command: e.name } };
  });
  on('session.start', () => ({ cwd: '/work' }));
  on('ui.log', ($, e) => {
    world.logs.push(e.text);
    return { value: undefined };
  });
  on('ui.open', ($, e) => {
    world.opens.push(e.id);
    return { value: { isPlaced: true } };
  });
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    world.commands.push(String(e.command));
    if (answer === 'refuse') {
      return { deny: 'permission denied by the user' };
    }
    return {
      result: {
        stdout: `${SENT}\n`,
        stderr: '',
        interrupted: false,
      },
    };
  });
  return world;
}

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

test('session start registers rm-send, execs and draws nothing', async ($, on) => {
  const world = stubWorld(on);

  await startSession($);
  expect(world.registered).toEqual(['rm-send']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('a run execs the shipped CLI, reports its stdout as one dim line, answers nothing', async ($, on) => {
  const world = stubWorld(on);
  await startSession($);

  const answer = await runSend($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/send\.mjs$/),
  ]);
  expect(world.logs).toEqual([SENT]);
});

test('a refused exec reports the refusal, answers nothing, no crash', async ($, on) => {
  const world = stubWorld(on, 'refuse');
  await startSession($);

  const answer = await runSend($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/send\.mjs$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
});
