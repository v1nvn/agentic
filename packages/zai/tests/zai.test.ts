import { expect, test } from 'claude-code/testing';

import type { CommandRunResult, On } from 'claude-code';
import type { Engine } from 'claude-code/testing';

/** A real render of a two-hour window — the report the CLI prints on stdout. */
const REPORT = `────────────────────────────────────────────────────────────────────
 GLM Coding Plan · Max              Oct 04 07:30 → Oct 04 08:30 · 2h
────────────────────────────────────────────────────────────────────

 420.0K tokens across 6 model calls — 71% of it in a single hour (Oct 04 08:30, 300.0K tokens / 4 calls).

 Peak     Oct 04 08:30    300.0K tokens ·     4 calls
 Active   2 / 2 hours    no idle gaps
 Tools    8 calls        3 searches · 5 reads
 Peak hrs Mon–Fri 11:30–15:30 · GLM-5.2 3× · 0h active · 0 (0%)

 Hourly tokens · ↑ peak hour ───────────────────────────────────────
 300.0K ┤                              ████████████████████████████
        │                              ████████████████████████████
        │                              ████████████████████████████
        │ ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃ ████████████████████████████
        │ ████████████████████████████ ████████████████████████████
        │ ████████████████████████████ ████████████████████████████
      0 └───────────────┬────────────────────────────┬──────────────
                        07                           08
                        Oct 04
                                                     ◂
   ◂ peak  Oct 04 08:30  300.0K tokens · 4 calls

 Model mix ─────────────────────────────────────────────────────────
   GLM-5.2      420.0K  100.0%  ████████████████████

 Limits ────────────────────────────────────────────────────────────
   Peak            11:30  ░░░░░░░░░░░░░░░░░░░░░░  15:30
   Tokens · 5h       42%  █████████░░░░░░░░░░░░░  12:30:00 pm

────────────────────────────────────────────────────────────────────`;

/** The no-key shape: the CLI ran, resolved no token, exited 1 on this stderr. */
const NO_KEY = 'no API key: set ZAI_AUTH_TOKEN (or --auth-token)';

type World = {
  commands: string[];
  logs: string[];
  opens: string[];
  registered: string[];
};

function stubWorld(
  on: On,
  answer: 'no-key' | 'refuse' | 'report' = 'report',
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
    if (answer === 'no-key') {
      return {
        result: {
          stdout: '',
          stderr: NO_KEY,
          interrupted: false,
        },
      };
    }
    return {
      result: {
        stdout: `${REPORT}\n`,
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

async function runUsage($: Engine): Promise<CommandRunResult> {
  return $.command.run({
    command: 'zai-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
}

test('session start registers zai-usage, execs and draws nothing', async ($, on) => {
  const world = stubWorld(on);

  await startSession($);
  expect(world.registered).toEqual(['zai-usage']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('a run execs the shipped CLI, reports its stdout verbatim as dim transcript rows, answers nothing', async ($, on) => {
  const world = stubWorld(on);
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs$/),
  ]);
  expect(world.logs).toEqual([REPORT]);
});

test('a refused exec reports the refusal, answers nothing, no crash', async ($, on) => {
  const world = stubWorld(on, 'refuse');
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
});

test('a failed query reports its reason, not the bare fallback', async ($, on) => {
  const world = stubWorld(on, 'no-key');
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([NO_KEY]);
});
