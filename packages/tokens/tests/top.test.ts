import { expect, mock, test } from 'claude-code/testing';

import type { On, SessionUsage } from 'claude-code';
import type { Engine } from 'claude-code/testing';

const TICK_MS = 500;

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

type World = {
  opens: string[];
  rosters: number;
};

function stubWorld(on: On): World {
  const world: World = { opens: [], rosters: 0 };
  const openIds = new Set<string>();
  on('command.register', () => ({ value: { command: 'tokens-top' } }));
  on('session.start', () => ({ cwd: '/work' }));
  on('session.model', () => ({ value: 'glm-5.3[1m]' }));
  on('session.version', () => ({ value: { version: '2.1.287' } }));
  on('session.cwd', () => ({ value: '/Users/vineet/git/agentic' }));
  on('session.turns', () => ({ value: 47 }));
  on('session.surfaces', () => ({ value: ['terminal'] }));
  on('session.usage', () => ({ value: MEASURE }));
  on('session.measure', (_$, e) => ({ changed: e.changed }));
  on('agent.list', () => {
    world.rosters += 1;
    return {
      value: [
        {
          id: 'a1',
          description: 'audit the render',
          type: 'Explore',
          status: 'running',
          name: 'Explore',
        },
      ],
    };
  });
  on('ui.open', ($, e) => {
    world.opens.push(e.id);
    openIds.add(e.id);
    return { value: { isPlaced: true } };
  });
  on('ui.panes', () => ({
    value: [...openIds].map(id => ({
      id,
      title: 'Session',
      isShown: true,
      isFocused: true,
      isPlaced: true,
    })),
  }));
  return world;
}

async function startSession($: Engine): Promise<void> {
  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
}

test('/tokens-top opens the pane; startup draws nothing; the measure fills it', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on);

  await startSession($);
  expect(world.opens).toEqual([]);

  const answer = await $.command.run({
    command: 'tokens-top',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  expect(answer.text).toBeUndefined();
  expect(world.opens).toEqual(['tokens-top']);

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
  expect(await ui.find({ type: 'Text', text: /week\s+34%/ })).toBeDefined();
  expect(await ui.find({ type: 'Text', text: /Explore/ })).toBeDefined();
  expect(
    await ui.find({ type: 'Text', text: /audit the render/ }),
  ).toBeDefined();
  await ui.unmount();
});

test('the ring samples only while the pane is open', async ($, on) => {
  const clock = mock.clock(on);
  const world = stubWorld(on);

  await startSession($);
  await $.session.measure({
    context: MEASURE.context,
    rateLimits: [],
    cost: MEASURE.cost,
    changed: ['context'],
  });

  await clock.advance(TICK_MS * 4);
  expect(world.rosters).toEqual(0);

  await $.command.run({
    command: 'tokens-top',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });
  await clock.advance(TICK_MS * 2);
  expect(world.rosters).toBeGreaterThan(0);
});

test('completed tool calls leave no running rows behind', async ($, on) => {
  mock.clock(on);
  const world = stubWorld(on);
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
