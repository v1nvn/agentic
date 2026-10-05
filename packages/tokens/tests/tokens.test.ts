import { expect, mock, test } from 'claude-code/testing';

import type { ScanResult } from '../src/aggregate.js';

import { ymd } from '../src/text.js';

import type { On } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const REFRESH_MS = 5 * 60 * 1000;

/** One model call in the 24h window — 970 read / (30 in + 970 read) = 97% hit; 30+10+970 = 1.0K. */
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

const PANE = {
  plugin: 'tokens',
  component: 'Pane',
  requestId: 'tokens-usage',
  viewport: { columns: 100, rows: 30 },
  props: {
    title: 'Token usage',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
} as const;

type World = {
  commands: string[];
  opens: string[];
};

function stubWorld(on: On, answer: 'report' | 'throw' = 'report'): World {
  const world: World = { commands: [], opens: [] };
  const openIds = new Set<string>();
  on('command.register', () => ({ value: { command: 'tokens-usage' } }));
  on('session.start', () => ({ cwd: '/work' }));
  on('ui.open', ($, e) => {
    world.opens.push(e.id);
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
    if (answer === 'throw') {
      throw new Error('permission denied by the user');
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

test('/tokens-usage execs the shipped CLI into the pane; startup draws and execs nothing', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on);

  await startSession($);
  expect(world.commands).toEqual([]);

  await $.command.run({
    command: 'tokens-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/report\.mjs --json$/),
  ]);
  expect(world.opens).toEqual(['tokens-usage']);

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(
    await ui.find({ type: 'Text', text: /Token usage · transcripts/ }),
  ).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /glm-5\.3/ })).toBeDefined();
  await ui.unmount();
});

test('the clock refreshes the pane only while it is open', async ($, on) => {
  const clock = mock.clock(on);
  const world = stubWorld(on);

  await startSession($);
  await clock.advance(REFRESH_MS);
  expect(world.commands).toEqual([]);

  await $.command.run({
    command: 'tokens-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  expect(world.commands).toHaveLength(1);

  await clock.advance(REFRESH_MS);
  expect(world.commands).toHaveLength(2);
});

test('a refused or empty exec leaves the empty state, no crash', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on, 'throw');

  await startSession($);
  expect(world.commands).toEqual([]);

  await $.command.run({
    command: 'tokens-usage',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  const drawn = await ui.find({ type: 'Text' });
  expect(JSON.stringify(drawn)).toContain('no usage report');
  await ui.unmount();
});
