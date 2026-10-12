import { expect, mock, test } from 'claude-code/testing';

import type { RenderInput } from '../src/format.js';

import { reportLines } from '../src/format.js';
import { acceptJson, paneRows } from './kit/mod.js';
import { stubEngine } from './kit/stub.js';

import type { CommandRunResult } from 'claude-code';
import type { Engine } from 'claude-code/testing';

// The raw --json payload over a fixed two-hour fixture.
const RAW = {
  platform: 'ZAI',
  model: {
    x_time: ['2026-10-04 10:00', '2026-10-04 11:00'],
    tokensUsage: [120000, 300000],
    modelCallCount: [2, 4],
    totalUsage: { totalModelCallCount: 6, totalTokensUsage: 420000 },
    modelSummaryList: [
      { modelName: 'GLM-5.2', totalTokens: 420000, sortOrder: 1 },
    ],
  },
  tool: {
    totalUsage: { totalNetworkSearchCount: 3, totalWebReadMcpCount: 5 },
  },
  quota: { level: 'max', limits: [] },
} satisfies RenderInput;

const NO_KEY = 'no API key: set ZAI_AUTH_TOKEN (or --auth-token)';
const REFRESH_MS = 5 * 60 * 1000;

const PANE = {
  plugin: 'zai',
  component: 'Pane',
  requestId: 'zai-usage',
  viewport: { columns: 100, rows: 30 },
  props: {
    title: 'GLM usage',
    isFocused: true,
    bodyColumns: 70,
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
    command: 'zai-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
}

function acceptN(parsed: unknown): null | { n: number } {
  return typeof parsed === 'object' &&
    parsed !== null &&
    typeof (parsed as { n?: unknown }).n === 'number'
    ? (parsed as { n: number })
    : null;
}

test('the exec door: stdout accepted, every refusal one line', () => {
  const json = { n: 3 };
  const ok = { result: { stdout: JSON.stringify(json) } };
  expect(acceptJson(ok, 'query failed', acceptN)).toEqual({
    ok: true,
    value: json,
  });
  expect(
    acceptJson({ result: { stdout: 'not json' } }, 'query failed', acceptN),
  ).toEqual({ ok: false, line: 'not json' });
  expect(
    acceptJson({ result: { stdout: '{"n":"x"}' } }, 'query failed', acceptN),
  ).toEqual({ ok: false, line: '{"n":"x"}' });
  expect(
    acceptJson({ result: { stdout: '' } }, 'query failed', acceptN),
  ).toEqual({ ok: false, line: 'query failed' });
  expect(
    acceptJson({ deny: 'permission denied by the user' }, 'f', acceptN),
  ).toEqual({ ok: false, line: 'permission denied by the user' });
  expect(acceptJson({ isError: true, text: 'boom' }, 'f', acceptN)).toEqual({
    ok: false,
    line: 'boom',
  });
  expect(acceptJson({ isError: true }, 'query failed', acceptN)).toEqual({
    ok: false,
    line: 'query failed',
  });
});

test('pane chrome as fields: the frame sizes the rows a pane asks for', () => {
  expect(paneRows(10, { frame: true, id: 'p', title: 't' })).toBe(12);
  expect(paneRows(10, { frame: false, id: 'p', title: 't' })).toBe(10);
});

test('session start declaratively registers zai-usage, execs and draws nothing', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, {
    stdout: `${JSON.stringify(RAW)}\n`,
  });

  await startSession($);
  expect(world.registered).toEqual(['zai-usage']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('a run execs the shipped CLI with --json, accepts the raw payload, opens the pane sized to the report and renders it', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, {
    stdout: `${JSON.stringify(RAW)}\n`,
  });
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs usage --json$/),
  ]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([
    { id: 'zai-usage', rows: reportLines(RAW).length + 2 },
  ]);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(
    await ui.find({ type: 'Text', text: /GLM Coding Plan · Max/ }),
  ).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /tokens across 6 model calls/ }),
  ).toBeDefined();
  await ui.unmount();
});

test('the pane re-scans on its refresh tick while open, quietly keeping its last good report', async ($, on) => {
  const clock = mock.clock(on);
  const world = stubEngine(on, {
    stdout: `${JSON.stringify(RAW)}\n`,
  });

  await startSession($);
  await clock.advance(REFRESH_MS * 2);
  expect(world.commands).toEqual([]);

  await runUsage($);
  expect(world.commands).toHaveLength(1);
  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(2);
  expect(world.logs).toEqual([]);

  world.answer = () => ({ stdout: '', stderr: NO_KEY });
  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(3);
  expect(world.logs).toEqual([]);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(
    await ui.find({ type: 'Text', text: /GLM Coding Plan · Max/ }),
  ).toBeDefined();
  await ui.unmount();

  world.close('zai-usage');
  await clock.advance(REFRESH_MS * 2);
  expect(world.commands).toHaveLength(3);
});

test('a refused exec logs the refusal, opens no pane, answers nothing', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, { deny: 'permission denied by the user' });
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs usage --json$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
  expect(world.opens).toEqual([]);
});

test('a failed exec logs its reason, opens no pane', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, { stderr: NO_KEY, stdout: '' });
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([NO_KEY]);
  expect(world.opens).toEqual([]);
});
