import { expect, mock, test } from 'claude-code/testing';

import type { ScanResult } from '../src/aggregate.js';

import { reportLines } from '../src/format.js';
import { ymd } from '../src/text.js';

import type { CommandRunResult, On } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const REFRESH_MS = 5 * 60 * 1000;

const ROW = {
  model: 'glm-5.3',
  input: 30,
  output: 10,
  cacheRead: 970,
  cacheCreation: 0,
  calls: 1,
};

const report: ScanResult = {
  now: new Date().toISOString(),
  days: [{ day: ymd(new Date()), ...ROW }],
  models: [ROW],
  last24: [ROW],
};

const LINES = reportLines(report, { now: new Date(report.now) });

const PANE = {
  plugin: 'tokens',
  component: 'Pane',
  requestId: 'tokens-usage',
  viewport: { columns: 100, rows: 30 },
  props: {
    title: 'Token usage',
    isFocused: true,
    bodyColumns: 72,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const;

type Answer = { mode: 'refuse' | 'report' | 'stderr' };
type World = {
  commands: string[];
  logs: string[];
  opens: { id: string; rows: number }[];
};

function stubWorld(on: On, answer: Answer = { mode: 'report' }): World {
  const world: World = { commands: [], logs: [], opens: [] };
  const openIds = new Set<string>();
  on('command.register', () => ({ value: { command: 'tokens-usage' } }));
  on('session.start', () => ({ cwd: '/work' }));
  on('ui.log', ($, e) => {
    world.logs.push(e.text);
    return { value: undefined };
  });
  on('ui.open', ($, e) => {
    world.opens.push({ id: e.id, rows: e.rows ?? 0 });
    openIds.add(e.id);
    return { value: { isPlaced: true } };
  });
  on('ui.panes', () => ({
    value: [...openIds].map(id => ({
      id,
      title: 'Token usage',
      isShown: true,
      isFocused: true,
      isPlaced: true,
    })),
  }));
  on('tool.call', { tool: 'Bash' }, ($, e) => {
    world.commands.push(String(e.command));
    if (answer.mode === 'refuse') {
      return { deny: 'permission denied by the user' };
    }
    if (answer.mode === 'stderr') {
      return {
        result: {
          stdout: '',
          stderr: 'no transcripts directory at /work',
          interrupted: false,
        },
      };
    }
    return {
      result: {
        stdout: JSON.stringify(report),
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
    command: 'tokens-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
}

test('/tokens-usage execs the shipped CLI into the pane; startup draws and execs nothing', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on);

  await startSession($);
  expect(world.commands).toEqual([]);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/report\.mjs usage --json$/),
  ]);
  expect(world.opens).toEqual([{ id: 'tokens-usage', rows: LINES.length + 2 }]);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(
    await ui.find({ type: 'Text', text: /Token usage · transcripts/ }),
  ).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /glm-5\.3/ })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /^read$/ })).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /Covers every profile/ }),
  ).toBeDefined();
  await ui.unmount();
});

test('the clock refreshes the pane only while it is open; a failed rescan keeps the last good state', async ($, on) => {
  const clock = mock.clock(on);
  const answer: Answer = { mode: 'report' };
  const world = stubWorld(on, answer);

  await startSession($);
  await clock.advance(REFRESH_MS);
  expect(world.commands).toEqual([]);

  await runUsage($);
  expect(world.commands).toHaveLength(1);

  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(2);

  answer.mode = 'refuse';
  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(3);
  expect(world.logs).toEqual([]);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(await ui.find({ type: 'Text', text: /glm-5\.3/ })).toBeDefined();
  await ui.unmount();
});

test('a refused exec logs the reason, opens no pane, answers nothing', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on, { mode: 'refuse' });

  await startSession($);
  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual(['permission denied by the user']);
  expect(world.opens).toEqual([]);
});

test('a failed exec logs its stderr reason, opens no pane', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on, { mode: 'stderr' });

  await startSession($);
  await runUsage($);
  expect(world.logs).toEqual(['no transcripts directory at /work']);
  expect(world.opens).toEqual([]);
});
