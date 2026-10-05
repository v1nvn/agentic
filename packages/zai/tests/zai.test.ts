import { expect, test } from 'claude-code/testing';

import type { CommandRunResult, On } from 'claude-code';
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
      text: '      0 └───────────────┬────────────────────────────┬──────────────',
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
      text: '14:00  ░░░░░░░░░░░░░░░░░░░░░░  18:00',
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

type World = {
  commands: string[];
  logs: string[];
  opens: { id: string; rows: number }[];
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
    world.opens.push({ id: e.id, rows: e.rows ?? 0 });
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
        stdout: `${JSON.stringify({ lines: LINES })}\n`,
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

test('a run execs the shipped CLI with --json, opens the pane sized to the report and draws its lines', async ($, on) => {
  const world = stubWorld(on);
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(answer.context).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs --json$/),
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

test('a refused exec logs the refusal, opens no pane, answers nothing', async ($, on) => {
  const world = stubWorld(on, 'refuse');
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.commands).toEqual([
    expect.stringMatching(/^node .*\/bin\/usage\.mjs --json$/),
  ]);
  expect(world.logs).toEqual(['permission denied by the user']);
  expect(world.opens).toEqual([]);
});

test('a failed exec logs its reason, opens no pane', async ($, on) => {
  const world = stubWorld(on, 'no-key');
  await startSession($);

  const answer = await runUsage($);
  expect(answer.text).toBeUndefined();
  expect(world.logs).toEqual([NO_KEY]);
  expect(world.opens).toEqual([]);
});
