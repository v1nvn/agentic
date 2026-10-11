import { expect, mock, test } from 'claude-code/testing';

import { acceptJson, paneRows } from './kit/mod.js';
import { stubEngine } from './kit/stub.js';

import type { CommandRunResult } from 'claude-code';
import type { Engine } from 'claude-code/testing';

// The real reportLines output over a fixed two-hour fixture, pasted verbatim: the engine's loader bars a test import of src/format.ts's npm graph.
type Line = { ink?: 'bold' | 'dim'; text: string }[];

const LINES: Line[] = [
  [
    {
      text: '────────────────────────────────────────────────────────────────────',
    },
  ],
  [
    {
      text: ' GLM Coding Plan · Max',
      ink: 'bold',
    },
    {
      text: '              Oct 04 10:00 → Oct 04 11:00 · 2h',
      ink: 'dim',
    },
  ],
  [
    {
      text: '────────────────────────────────────────────────────────────────────',
    },
  ],
  [],
  [
    {
      text: ' 420.0K tokens across 6 model calls',
    },
    {
      text: ' — ',
    },
  ],
  [
    {
      text: '71%',
      ink: 'bold',
    },
    {
      text: ' of it in a single hour',
    },
  ],
  [
    {
      text: ' (Oct 04 11:00, 300.0K tokens / 4 calls).',
    },
  ],
  [],
  [
    {
      text: ' Peak     Oct 04 11:00    300.0K tokens ·     4 calls',
    },
  ],
  [
    {
      text: ' Active   2 / 2 hours    no idle gaps',
    },
  ],
  [
    {
      text: ' Tools    8 calls        3 searches · 5 reads',
    },
  ],
  [
    {
      text: ' Peak hrs Mon–Fri 14:00–18:00 · GLM-5.2 3× · 0h active · 0 (',
    },
    {
      text: '0%',
      ink: 'bold',
    },
    {
      text: ')',
    },
  ],
  [],
  [
    {
      text: ' Hourly tokens · ↑ peak hour ───────────────────────────────────────',
      ink: 'dim',
    },
  ],
  [
    {
      text: ' 300.0K ┤                              ████████████████████████████',
    },
  ],
  [
    {
      text: '        │                              ████████████████████████████',
    },
  ],
  [
    {
      text: '        │                              ████████████████████████████',
    },
  ],
  [
    {
      text: '        │ ▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃▃ ████████████████████████████',
    },
  ],
  [
    {
      text: '        │ ████████████████████████████ ████████████████████████████',
    },
  ],
  [
    {
      text: '        │ ████████████████████████████ ████████████████████████████',
    },
  ],
  [
    {
      text: '      0 └───────────────┬─────────────────────────────┬──────────────',
    },
  ],
  [
    {
      text: '                        10                           11',
    },
  ],
  [
    {
      text: '                        Oct 04',
    },
  ],
  [
    {
      text: '                                                     ◂',
    },
  ],
  [
    {
      text: '   ◂ peak  Oct 04 11:00  300.0K tokens · 4 calls',
    },
  ],
  [],
  [
    {
      text: ' Model mix ─────────────────────────────────────────────────────────',
      ink: 'dim',
    },
  ],
  [
    {
      text: '   GLM-5.2      420.0K  ',
    },
    {
      text: '100.0%',
      ink: 'bold',
    },
    {
      text: '  ████████████████████',
    },
  ],
  [],
  [
    {
      text: ' Limits ────────────────────────────────────────────────────────────',
      ink: 'dim',
    },
  ],
  [
    {
      text: '   Peak            ',
      ink: 'dim',
    },
    {
      text: '14:00  ░░░░░░░░░░░░░░░░░░░░░░░  18:00',
    },
  ],
  [
    {
      text: '   Tokens · 5h     ',
      ink: 'dim',
    },
    {
      text: '  42%',
      ink: 'bold',
    },
    {
      text: '  █████████░░░░░░░░░░░░░  12:30:00 pm',
    },
  ],
  [],
  [
    {
      text: '   MCP · this month',
      ink: 'dim',
    },
    {
      text: '  30%',
      ink: 'bold',
    },
    {
      text: '  ███████░░░░░░░░░░░░░░░  Invalid Date',
    },
  ],
  [
    {
      text: '   308M / 1,000M · web search 223',
    },
  ],
  [],
  [
    {
      text: '────────────────────────────────────────────────────────────────────',
    },
  ],
];

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
    stdout: `${JSON.stringify({ lines: LINES })}\n`,
  });

  await startSession($);
  expect(world.registered).toEqual(['zai-usage']);
  expect(world.commands).toEqual([]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([]);
});

test('a run execs the shipped CLI with --json, opens the pane sized to the report and draws its lines', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on, {
    stdout: `${JSON.stringify({ lines: LINES })}\n`,
  });
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs usage --json$/),
  ]);
  expect(world.logs).toEqual([]);
  expect(world.opens).toEqual([{ id: 'zai-usage', rows: LINES.length + 2 }]);

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
    stdout: `${JSON.stringify({ lines: LINES })}\n`,
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
