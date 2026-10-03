import { expect, mock, test } from 'claude-code/testing';

const HOUR = 3600 * 1000;

/** Two usage entries: one in the 24h window, one eight days out. */
const transcript = [
  {
    type: 'assistant',
    timestamp: new Date(Date.now() - HOUR).toISOString(),
    message: {
      model: 'glm-5.3',
      usage: {
        input_tokens: 30,
        output_tokens: 10,
        cache_read_input_tokens: 970,
      },
    },
  },
  {
    type: 'assistant',
    timestamp: new Date(Date.now() - 8 * 24 * HOUR).toISOString(),
    message: { model: 'glm-5.3', usage: { input_tokens: 5 } },
  },
]
  .map(entry => JSON.stringify(entry))
  .join('\n');

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

test('/tokens scans transcripts into the status line and opens the pane', async ($, on) => {
  mock.env(on, { CLAUDE_DIR: '/fake-claude' });
  mock.clock(on);
  on('fs.list', ($, e) => ({
    value:
      e.path === '/fake-claude/projects'
        ? [{ name: '-proj', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }]
        : e.path.endsWith('-proj')
          ? [
              {
                name: 's.jsonl',
                kind: 'file',
                size: 1,
                mtimeMs: Date.now(),
                isLink: false,
              },
            ]
          : [],
  }));
  on('fs.read', ($, e) => ({
    value: e.path.endsWith('s.jsonl') ? transcript : '',
  }));
  on('command.register', () => ({ value: { command: 'tokens' } }));
  on('session.start', () => ({ cwd: '/work' }));
  const status: (string | undefined)[] = [];
  on('ui.status', ($, e) => {
    status.push(e.text);
    return { value: undefined };
  });
  const opened: string[] = [];
  on('ui.open', ($, e) => {
    opened.push(e.id);
    return { value: { isPlaced: true } };
  });

  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
  await $.command.run({
    command: 'tokens',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });

  // 970 read / (30 in + 970 read) = 97% hit; 30+10+970 = 1010 tokens today.
  expect(status.at(-1)).toBe('tokens 24h 1.0K · 97% hit · today 1.0K');
  expect(opened).toEqual(['tokens-usage']);
});

test('the pane draws the report as markdown on both surfaces', async ($, on) => {
  mock.env(on, { CLAUDE_DIR: '/fake-claude' });
  mock.clock(on);
  on('fs.list', ($, e) => ({
    value:
      e.path === '/fake-claude/projects'
        ? [{ name: '-proj', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }]
        : [
            {
              name: 's.jsonl',
              kind: 'file',
              size: 1,
              mtimeMs: Date.now(),
              isLink: false,
            },
          ],
  }));
  on('fs.read', () => ({ value: transcript }));
  on('command.register', () => ({ value: { command: 'tokens' } }));
  on('session.start', () => ({ cwd: '/work' }));
  on('ui.status', () => ({ value: undefined }));
  on('ui.open', () => ({ value: { isPlaced: true } }));

  await $.session.start({
    surface: 'terminal',
    isInteractive: true,
    cwd: '/work',
  });
  await $.command.run({
    command: 'tokens',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  });

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface });
    const drawn = await ui.find({ type: 'Markdown' });
    expect(drawn).toBeDefined();
    expect(JSON.stringify(drawn)).toContain('glm-5.3');
    await ui.unmount();
  }
});
