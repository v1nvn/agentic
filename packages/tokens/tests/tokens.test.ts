import { expect, mock, test } from 'claude-code/testing';

import type { ScanResult } from '../src/aggregate.ts';

import { reportLines } from '../src/format.ts';
import { ymd } from '../src/text.ts';
import { stubEngine } from './stub.ts';

import type { CommandRunResult } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const REFRESH_MS = 5 * 60 * 1000;

const ROW = {
  model: 'glm-5.3',
  input: 30,
  output: 10,
  cacheRead: 970,
  cacheWrite: 0,
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
  const world = stubEngine(on, { stdout: JSON.stringify({ lines: LINES }) });

  await startSession($);
  expect(world.commands).toEqual([]);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/src\/index\.ts usage --json$/),
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

test('the pane re-scans on its refresh tick only while open; a failed rescan keeps the last good state', async ($, on) => {
  const clock = mock.clock(on);
  const world = stubEngine(on, { stdout: JSON.stringify({ lines: LINES }) });

  await startSession($);
  await clock.advance(REFRESH_MS);
  expect(world.commands).toEqual([]);

  await runUsage($);
  expect(world.commands).toHaveLength(1);

  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(2);

  world.answer = () => ({ deny: 'permission denied by the user' });
  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(3);
  expect(world.logs).toEqual([]);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(await ui.find({ type: 'Text', text: /glm-5\.3/ })).toBeDefined();
  await ui.unmount();
});

test('a refused exec logs the reason, opens no pane, answers nothing', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, { deny: 'permission denied by the user' });

  await startSession($);
  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual(['permission denied by the user']);
  expect(world.opens).toEqual([]);
});

test('a failed exec logs its stderr reason, opens no pane', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, {
    stderr: 'no transcripts directory at /work',
    stdout: '',
  });

  await startSession($);
  await runUsage($);
  expect(world.logs).toEqual(['no transcripts directory at /work']);
  expect(world.opens).toEqual([]);
});
