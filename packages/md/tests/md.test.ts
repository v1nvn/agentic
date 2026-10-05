import { expect, test } from 'claude-code/testing';

import type { CommandRunResult, On } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const SENT = 'Opened in Markdown-Viewer (link copied).';

/** The fresh-project shape: the CLI found no transcript to share. */
const NO_REPLY =
  'no session transcript found in /Users/v1n/.claude/projects/-work';

type World = {
  commands: string[];
  logs: string[];
  opens: string[];
  registered: string[];
};

function stubWorld(
  on: On,
  answer: 'no-reply' | 'refuse' | 'sent' = 'sent',
): World {
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
    if (answer === 'no-reply') {
      return {
        result: {
          stdout: '',
          stderr: NO_REPLY,
          interrupted: false,
        },
      };
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

test('session start registers md-edit and md-view, execs and draws nothing', async ($, on) => {
  const world = stubWorld(on);

  await startSession($);
  expect(world.registered).toEqual(['md-edit', 'md-view']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('an md-edit run execs the CLI plain, reports its stdout as one dim line, answers nothing', async ($, on) => {
  const world = stubWorld(on);
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/send\.mjs$/),
  ]);
  expect(world.logs).toEqual([SENT]);
});

test('an md-view run adds the --view flag — the two commands are distinct exec lines', async ($, on) => {
  const world = stubWorld(on);
  await startSession($);

  await run($, 'md-edit');
  const answer = await run($, 'md-view');
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/send\.mjs$/),
    expect.stringMatching(/^node .*\/bin\/send\.mjs --view$/),
  ]);
  expect(world.logs).toEqual([SENT, SENT]);
});

test('a refused exec reports the refusal, answers nothing, no crash', async ($, on) => {
  const world = stubWorld(on, 'refuse');
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/send\.mjs$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
});

test('a failed share reports its reason, not the bare fallback', async ($, on) => {
  const world = stubWorld(on, 'no-reply');
  await startSession($);

  const answer = await run($, 'md-edit');
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([NO_REPLY]);
});
