import { existsSync, readFileSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs } from '../src/cli.js';
import { configure } from '../src/configure.js';
import { materializeDemoRepo } from '../src/demo-repo.js';
import { renderPreview, type PreviewRender } from '../src/payloads.js';
import { preview, type PreviewOptions } from '../src/preview.js';
import { resolveRuntime } from '../src/resolve.js';
import { THEMES } from '../src/themes.js';
import {
  backupPath,
  createHomes,
  installRuntime,
  settingsPath,
  writeSettings,
} from './fixtures.js';
import { DEFAULT_NOW } from './runtime.js';

const ESC = '\x1b';

// The render sample, synthesized here so the preview suite owns its bytes:
// a session with context fill, a warm cache, spend, a clock, a diffstat,
// rate rows, and a live git branch — heavy enough that the gauges, glyphs,
// and counters of every theme actually render. NOW-relative fields anchor to
// DEFAULT_NOW so the render is deterministic.
const SAMPLE_MODEL = 'Fable [1m]';

function samplePayload(repoDir: string): string {
  const now = Number(DEFAULT_NOW);
  const payload = {
    session_id: 'u4preview00000',
    session_name: 'preview-sample',
    transcript_path: '/Users/vineet/.claude/projects/demo/x.jsonl',
    version: '2.1.275',
    cwd: repoDir,
    model: { id: 'glm-5.3', display_name: SAMPLE_MODEL },
    workspace: {
      current_dir: repoDir,
      project_dir: repoDir,
      added_dirs: [],
      repo: { host: 'github.com', owner: 'vineet', name: 'atlas-web' },
    },
    output_style: { name: 'default' },
    effort: { level: 'high' },
    thinking: { enabled: true },
    fast_mode: false,
    vim: { mode: 'NORMAL' },
    pr: {
      number: 4242,
      url: 'https://github.com/vineet/atlas-web/pull/4242',
      review_state: 'pending',
    },
    cost: {
      total_cost_usd: 12.34,
      total_duration_ms: 4925000,
      total_api_duration_ms: 742000,
      total_lines_added: 156,
      total_lines_removed: 23,
    },
    context_window: {
      total_input_tokens: 84000,
      total_output_tokens: 4100,
      context_window_size: 200000,
      used_percentage: 73.2,
      remaining_percentage: 26.8,
    },
    prompt_cache: {
      hit_ratio: 0.86,
      warm: true,
      expires_at: now + 240,
      ttl: '5m',
    },
    rate_limits: {
      five_hour: { used_percentage: 33, resets_at: now + 4980 },
      seven_day: { used_percentage: 66, resets_at: now + 360000 },
      spend_limit: { used_percentage: 9, resets_at: now + 7200 },
    },
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function sampleTick(): string {
  const tick = {
    columns: 200,
    tasks: [
      {
        id: 'sample-scrape',
        label: 'Scraper',
        name: 'scraper',
        description: 'Walking the sitemap for preview rows',
        model: 'Sonnet [1m]',
        effort: 'high',
        contextWindowSize: 200000,
        tokenCount: 84000,
        startTime: Number(DEFAULT_NOW) - 90,
      },
      {
        id: 'sample-idle',
        label: 'Idle',
        name: 'idle',
        description: '',
        model: '',
        effort: '',
        contextWindowSize: 0,
        tokenCount: 0,
        startTime: 0,
      },
    ],
  };
  return `${JSON.stringify(tick, null, 2)}\n`;
}

const homes = createHomes();

afterEach(() => {
  homes.dispose();
});

function installedHome(): string {
  const home = homes.newHome();
  installRuntime(home);
  return home;
}

function assertNothingWritten(home: string): void {
  expect(existsSync(settingsPath(home)), 'settings.json').toBe(false);
  expect(existsSync(backupPath(home)), 'backup').toBe(false);
}

function messageOf(job: () => void): string {
  try {
    job();
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the resolution to refuse');
}

function withTtyStdout(job: () => void): void {
  const stdout = process.stdout as { isTTY?: boolean };
  const had = Object.getOwnPropertyDescriptor(stdout, 'isTTY');
  Object.defineProperty(stdout, 'isTTY', { configurable: true, value: true });
  try {
    job();
  } finally {
    if (had === undefined) {
      delete stdout.isTTY;
    } else {
      Object.defineProperty(stdout, 'isTTY', had);
    }
  }
}

function withEnv(
  name: string,
  value: string | undefined,
  job: () => void,
): void {
  const had = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    job();
  } finally {
    if (had === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = had;
    }
  }
}

describe('preview: parsing', () => {
  it('parses the full flag set; rejects writer, fallback, and dry-run flags', () => {
    expect(
      parseArgs([
        'preview',
        '--theme',
        'lean',
        '--layout',
        '{model bar}',
        '--model',
        'pill',
        '--plain',
        '--home',
        '/tmp/lab-home',
      ]),
    ).toMatchObject({
      command: 'preview',
      home: '/tmp/lab-home',
      layout: '{model bar}',
      plain: true,
      theme: 'lean',
      variants: { model: 'pill' },
    });
    expect(parseArgs(['preview'])).toEqual({
      version: false,
      command: 'preview',
    });
    expect(parseArgs(['preview', '--dry-run'])).toBeUndefined();
    expect(parseArgs(['preview', '--force'])).toBeUndefined();
    expect(parseArgs(['preview', '--fallback=default'])).toBeUndefined();
    expect(parseArgs(['preview', '--bogus'])).toBeUndefined();
    expect(parseArgs(['preview', 'stray'])).toBeUndefined();
  });

  it('offers a valued flag for every registry item', () => {
    const home = installedHome();
    for (const item of resolveRuntime({ home }).items.map(
      entry => entry.item,
    )) {
      expect(parseArgs(['preview', `--${item}`, 'zzz']), item).toMatchObject({
        command: 'preview',
        variants: { [item]: 'zzz' },
      });
    }
  });

  it("a bare preview rides the engine's no-layout refusal", () => {
    const home = installedHome();
    const message = messageOf(() => preview({ home, now: DEFAULT_NOW }));
    expect(message).toBe('no layout — pass --layout <spec> or --theme <name>');
  });
});

describe('renderPreview: both surfaces from one resolution', () => {
  it('renders the status line and the panel row from one values bag', () => {
    const home = installedHome();
    const { line, panel } = renderPreview({
      home,
      layout: THEMES.lean.layout,
      main: samplePayload(materializeDemoRepo(home)),
      now: DEFAULT_NOW,
      runtime: resolveRuntime({ home }),
      tick: sampleTick(),
      values: THEMES.lean.variants,
    });

    expect(line).toContain(SAMPLE_MODEL);
    expect(line).toContain('f/login-flow');
    expect(line).toContain('73%');
    expect(line).toContain('⚡86%');
    expect(line).toContain('$12.34');
    expect(line).toContain('82m05s');
    expect(line).not.toContain('█');
    expect(panel).toContain('Scraper');
    expect(panel).toContain('Sonnet [1m]');
    expect(panel).toContain('42%');
    expect(panel).toContain('1m30s');
    expect(panel).toContain('████░░░░░░');
    expect(panel).not.toContain(SAMPLE_MODEL);
  });

  it('the resolution style pick reaches the panel row too', () => {
    const home = installedHome();
    const lean = {
      home,
      layout: THEMES.lean.layout,
      main: samplePayload(materializeDemoRepo(home)),
      now: DEFAULT_NOW,
      runtime: resolveRuntime({ home }),
      tick: sampleTick(),
      values: THEMES.lean.variants,
    } satisfies PreviewRender;

    const dots = renderPreview(lean).panel;
    const plain = renderPreview({
      ...lean,
      values: THEMES.classic.variants,
    }).panel;

    expect(dots).toContain(' · ');
    expect(plain).toContain(' │ ');
  });

  it('an item-flag swap over the theme restyles the line', () => {
    const home = installedHome();
    const lean = {
      home,
      layout: THEMES.lean.layout,
      main: samplePayload(materializeDemoRepo(home)),
      now: DEFAULT_NOW,
      runtime: resolveRuntime({ home }),
      tick: sampleTick(),
      values: THEMES.lean.variants,
    } satisfies PreviewRender;

    const swapped = renderPreview({
      ...lean,
      values: { ...THEMES.lean.variants, bar: 'gauge' },
    }).line;

    expect(swapped).not.toBe(renderPreview(lean).line);
    expect(swapped).toContain('█');
    expect(swapped).toContain('73%');
  });
});

describe('renderPreview: plain', () => {
  function leanSpec(home: string): PreviewRender {
    return {
      home,
      layout: THEMES.lean.layout,
      main: samplePayload(materializeDemoRepo(home)),
      now: DEFAULT_NOW,
      runtime: resolveRuntime({ home }),
      tick: sampleTick(),
      values: THEMES.lean.variants,
    };
  }

  it('plain strips every ESC byte and keeps every glyph', () => {
    const home = installedHome();
    const { line, panel } = renderPreview({ ...leanSpec(home), plain: true });

    expect(line).not.toContain(ESC);
    expect(panel).not.toContain(ESC);
    expect(line).toContain(' · ');
    expect(line).toContain('⚡86%');
    expect(panel).toContain('████░░░░░░');
  });

  it('renders colored when plain is unset and color is allowed', () => {
    const home = installedHome();
    withEnv('NO_COLOR', undefined, () => {
      const { line, panel } = renderPreview(leanSpec(home));
      expect(line).toContain(`${ESC}[36m${SAMPLE_MODEL}`);
      expect(panel).toContain(`${ESC}[32m████`);
    });
  });

  it('NO_COLOR in the environment renders plain', () => {
    const home = installedHome();
    withEnv('NO_COLOR', '1', () => {
      const { line, panel } = renderPreview(leanSpec(home));
      expect(line).not.toContain(ESC);
      expect(panel).not.toContain(ESC);
    });
  });
});

describe('preview: theme alone', () => {
  it('renders both surfaces from one resolution and writes nothing', () => {
    const home = installedHome();
    const text = preview({ home, theme: 'lean', now: DEFAULT_NOW });

    const lines = text.split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('preview at 200 columns — nothing written');
    expect(lines[1]).toContain('Opus');
    expect(lines[1]).toContain('f/login-flow');
    expect(lines[1]).toContain('58%');
    expect(lines[1]).toContain('⚡94%');
    expect(lines[1]).toContain('$3.87');
    expect(lines[2]).toMatch(/^panel /);
    expect(lines[2]).toContain('Explore');
    expect(lines[2]).toContain('Sonnet [1m]');
    expect(lines[3]).toBe('');
    assertNothingWritten(home);
  });

  it('leaves an existing settings file byte-unchanged, no backup', () => {
    const home = installedHome();
    const seed = `${JSON.stringify(
      {
        model: 'opus-4',
        statusLine: { type: 'command', command: './old-main.sh' },
      },
      null,
      2,
    )}\n`;
    writeSettings(home, seed);

    preview({ home, theme: 'rich', now: DEFAULT_NOW });

    expect(readFileSync(settingsPath(home), 'utf8')).toBe(seed);
    expect(existsSync(backupPath(home)), 'backup').toBe(false);
  });
});

describe('preview: the same resolution inputs configure takes', () => {
  type Resolution = Pick<PreviewOptions, 'layout' | 'theme' | 'variants'>;

  it('an item flag swaps exactly that pick over the theme', () => {
    const home = installedHome();
    const text = preview({
      home,
      theme: 'lean',
      variants: { bar: 'gauge' },
      now: DEFAULT_NOW,
    });

    expect(text).toContain('█');
    expect(text).toContain('58%');
    assertNothingWritten(home);
  });

  it('layout and item flags render with no theme named', () => {
    const home = installedHome();
    const text = preview({
      home,
      layout: '{model bar}',
      variants: { bar: 'gauge', model: 'pill' },
      now: DEFAULT_NOW,
    });

    expect(text.split('\n')[1]).toContain('Opus');
    expect(text).toContain('█');
    expect(text).toContain('58%');
    assertNothingWritten(home);
  });

  const refusals: readonly (readonly [string, Resolution])[] = [
    ['a theme gap', { layout: '{model effort} {cwd}', theme: 'quiet' }],
    [
      'a flag gap with no theme',
      { layout: '{model effort}', variants: { model: 'block' } },
    ],
    ['an unknown theme', { theme: 'nope' }],
    ['an unknown variant', { theme: 'lean', variants: { model: 'nonsense' } }],
  ];

  it.each(refusals)(
    "preview refuses %s with configure's exact message",
    (_name, options) => {
      const configured = installedHome();
      const previewed = installedHome();

      const byConfigure = messageOf(() =>
        configure({ home: configured, ...options }),
      );
      const byPreview = messageOf(() =>
        preview({ home: previewed, now: DEFAULT_NOW, ...options }),
      );

      expect(byPreview).toBe(byConfigure);
      assertNothingWritten(previewed);
    },
  );
});

describe('preview: plain and the terminal', () => {
  it('renders plain by default when stdout is piped', () => {
    const home = installedHome();
    const text = preview({ home, theme: 'lean', now: DEFAULT_NOW });

    expect(process.stdout.isTTY).toBeFalsy();
    expect(text).not.toContain(ESC);
    expect(text).toContain(' · ');
    expect(text).toContain('⚡94%');
    expect(text).toContain('███████░░░');
  });

  it('renders colored by default on a TTY', () => {
    const home = installedHome();
    withEnv('NO_COLOR', undefined, () => {
      withTtyStdout(() => {
        const text = preview({ home, theme: 'lean', now: DEFAULT_NOW });
        expect(text).toContain(`${ESC}[36mOpus`);
      });
    });
  });

  it('plain forces zero ESC bytes even on a TTY', () => {
    const home = installedHome();
    withTtyStdout(() => {
      const text = preview({
        home,
        theme: 'lean',
        plain: true,
        now: DEFAULT_NOW,
      });
      expect(text).not.toContain(ESC);
      expect(text).toContain('⚡94%');
    });
  });

  it('NO_COLOR forces plain even on a TTY', () => {
    const home = installedHome();
    withEnv('NO_COLOR', '1', () => {
      withTtyStdout(() => {
        const text = preview({ home, theme: 'lean', now: DEFAULT_NOW });
        expect(text).not.toContain(ESC);
      });
    });
  });
});
