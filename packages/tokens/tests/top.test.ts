import { expect, mock, test } from 'claude-code/testing';

import { ageAgents, cellAt } from './kit/mod.js';
import { stubEngine } from './kit/stub.js';

import type { On, SessionUsage } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const TICK_MS = 500;
const RING_MAX = 5;

const MEASURE = {
  context: {
    tokens: 124100,
    window: 200000,
    percent: 62,
    breakdown: {
      model: 'glm-5.3',
      totalTokens: 124100,
      maxTokens: 200000,
      rawMaxTokens: 156000,
      autocompactSource: 'auto',
      percentage: 62,
      gridRows: [],
      agents: [],
      apiUsage: null,
      isAutoCompactEnabled: true,
      autoCompactThreshold: 156000,
      categories: [
        {
          name: 'Messages',
          tokens: 84200,
          kind: 'used',
          color: 'c',
          isDeferred: false,
        },
        {
          name: 'Tools',
          tokens: 12100,
          kind: 'used',
          color: 'c',
          isDeferred: false,
        },
        {
          name: 'Free space',
          tokens: 74000,
          kind: 'free',
          color: 'c',
          isDeferred: false,
        },
      ],
      mcpTools: [
        {
          name: 'click',
          serverName: 'chrome-devtools',
          tokens: 4200,
          isLoaded: true,
        },
        {
          name: 'search',
          serverName: 'enhansome',
          tokens: 2100,
          isLoaded: true,
        },
      ],
      memoryFiles: [{ path: 'CLAUDE.md', type: 'memory', tokens: 2600 }],
    },
  },
  rateLimits: [
    { kind: 'five_hour', percentUsed: 71, resetsAt: '2026-10-07T16:35:00Z' },
    { kind: 'seven_day', percentUsed: 34 },
  ],
  cost: { usd: 4.13 },
  startedAt: 0,
} satisfies SessionUsage;

const PANE = {
  plugin: 'tokens',
  component: 'Pane',
  requestId: 'tokens-top',
  viewport: { columns: 100, rows: 40 },
  props: {
    title: 'Session',
    isFocused: true,
    bodyColumns: 60,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const;

test('tick cleanup: one cell per agent, ids leave with the roster', () => {
  const cells = new Map();
  const a1 = cellAt(cells, 'a1');
  a1.acc = 120;
  a1.spawnAt = 1000;
  cellAt(cells, 'gone').spawnAt = 900;

  const rows = ageAgents(cells, [{ id: 'a1' }, { id: 'a2' }], 2, RING_MAX);
  expect([...cells.keys()]).toEqual(['a1', 'a2']);
  expect(rows).toEqual([
    { id: 'a1', rate: 60, ring: [120], spawnAt: 1000 },
    { id: 'a2', rate: 0, ring: [0], spawnAt: null },
  ]);
  expect(cells.get('a1')?.acc).toBe(0);

  a1.acc = 60;
  ageAgents(cells, [{ id: 'a1' }], 2, RING_MAX);
  expect([...cells.keys()]).toEqual(['a1']);

  for (let i = 0; i < RING_MAX + 3; i += 1) {
    cells.get('a1')!.acc = i;
    ageAgents(cells, [{ id: 'a1' }], 1, RING_MAX);
  }
  expect(cells.get('a1')?.ring).toHaveLength(RING_MAX);
});

async function startSession($: Engine): Promise<void> {
  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
}

function stubSession(on: On): { roster: { id: string }[]; rosters: number } {
  const fixtures = { rosters: 0, roster: [{ id: 'a1' }] };
  on('session.model', () => ({ value: 'glm-5.3[1m]' }));
  on('session.version', () => ({ value: { version: '2.1.287' } }));
  on('session.cwd', () => ({ value: '/Users/v1n/git/agentic' }));
  on('session.turns', () => ({ value: 47 }));
  on('session.surfaces', () => ({ value: ['terminal'] }));
  on('session.usage', () => ({ value: MEASURE }));
  on('session.measure', (_$, e) => ({ changed: e.changed }));
  on('agent.list', () => {
    fixtures.rosters += 1;
    return {
      value: fixtures.roster.map(a => ({
        description: 'audit the render',
        id: a.id,
        name: 'Explore',
        status: 'running',
        type: 'Explore',
      })),
    };
  });
  return fixtures;
}

test('/tokens-top opens the pane; startup draws nothing; the measure fills it', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on);
  stubSession(on);

  await startSession($);
  expect(world.opens).toEqual([]);

  const answer = await $.command.run({
    command: 'tokens-top',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  expect(answer.text).toBeUndefined();
  expect(world.opens.map(o => o.id)).toEqual(['tokens-top']);

  await $.session.measure({
    context: MEASURE.context,
    rateLimits: MEASURE.rateLimits,
    cost: MEASURE.cost,
    changed: ['context', 'cost', 'rateLimits'],
  });

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(
    await ui.find({ type: 'Text', text: /glm-5\.3\[1m\] · 2\.1\.287/ }),
  ).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /47 prompts/ })).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /124\.1K \/ 200\.0K/ }),
  ).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /compact at 156\.0K/ }),
  ).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /messages 84\.2K · tools 12\.1K/ }),
  ).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /chrome-devtools 4\.2K/ }),
  ).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /CLAUDE\.md 2\.6K/ }),
  ).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /5h\s+71%/ })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /7d\s+34%/ })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /Explore/ })).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /audit the render/ }),
  ).toBeDefined();
  await ui.unmount();
});

test('the ring samples only while the pane is open', async ($, on) => {
  const clock = mock.clock(on);
  const world = stubEngine(on);
  const session = stubSession(on);

  await startSession($);
  await $.session.measure({
    context: MEASURE.context,
    rateLimits: [],
    cost: MEASURE.cost,
    changed: ['context'],
  });

  await clock.advance(TICK_MS * 4);
  expect(session.rosters).toEqual(0);

  await $.command.run({
    command: 'tokens-top',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  await clock.advance(TICK_MS * 2);
  expect(session.rosters).toBeGreaterThan(0);
  expect(world.opens.map(o => o.id)).toEqual(['tokens-top']);
});

test('completed tool calls leave no running rows behind', async ($, on) => {
  mock.clock(on);
  const world = stubEngine(on);
  stubSession(on);
  const results: string[] = [];
  on('tool.call', { tool: 'Read' }, () => ({
    result: { file: 'a.ts', filePath: 'a.ts', content: 'x' },
  }));

  await startSession($);
  await $.command.run({
    command: 'tokens-top',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });

  for (let i = 0; i < 3; i += 1) {
    const answer = await $.tool.call({
      tool: 'Read',
      file_path: `file${i}.ts`,
      tool_use_id: `tu_${i}`,
    });
    results.push(answer.deny ?? 'ran');
  }
  expect(results).toEqual(['ran', 'ran', 'ran']);
  void world;

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
  expect(await ui.find({ type: 'Text', text: /running ─/ })).toBeUndefined();
  expect(await ui.find({ type: 'Text', text: /file\d\.ts/ })).toBeUndefined();
  await ui.unmount();
});
