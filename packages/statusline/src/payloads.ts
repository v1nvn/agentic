import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isObject } from './configure.js';
import { materializeDemoRepo } from './demo-repo.js';
import { renderStatusline } from './render/index.js';
import { renderPanel } from './render/panel.js';
import { resolvePaint } from './render/theme.js';
import { capturePath } from './resolve.js';

const PAYLOADS_DIR = fileURLToPath(
  new URL('../assets/payloads', import.meta.url),
);
const TICKS_DIR = fileURLToPath(new URL('../assets/ticks', import.meta.url));

const P1_WARM_IN = 1920;
const P1_RESETS_IN: Readonly<Record<string, number>> = {
  five_hour: 13830,
  seven_day: 518400,
  spend_limit: 950400,
};
const PANEL_STEP_S = 300;

export interface PreviewSources {
  readonly cleanup: () => void;
  readonly main: string;
  readonly tick: string;
}

type Loose = Record<string, unknown>;

function anchoredP1(repoDir: string, now: number): string {
  const payload = JSON.parse(
    readFileSync(join(PAYLOADS_DIR, 'p1.json'), 'utf8'),
  ) as Loose;
  const cache = payload.prompt_cache;
  if (isObject(cache)) {
    if (cache.warm === true) {
      cache.expires_at = now + P1_WARM_IN;
      cache.last_miss_at = now + P1_WARM_IN - 3900;
    } else {
      cache.expires_at = now - 10;
      delete cache.last_miss_at;
    }
  }
  const limits = payload.rate_limits;
  if (isObject(limits)) {
    for (const [limitKey, offset] of Object.entries(P1_RESETS_IN)) {
      const limit = limits[limitKey];
      if (isObject(limit)) {
        limit.resets_at = now + offset;
      }
    }
  }
  (payload.workspace as { current_dir: string }).current_dir = repoDir;
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function hasStart(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// The panel drops a row's duration unless its start is at or before NOW
// (the elapsed >= 0 guard), so the demo schedule staggers every started row
// strictly into the past — ids and order ride over untouched.
function anchoredTick(now: number): string {
  const tick = JSON.parse(
    readFileSync(join(TICKS_DIR, 'multi.json'), 'utf8'),
  ) as Loose;
  const tasks = (Array.isArray(tick.tasks) ? tick.tasks : []) as Loose[];
  let started = 0;
  const staggered = {
    ...tick,
    tasks: tasks.map(task => {
      if (!hasStart(task.startTime)) {
        return task;
      }
      started += 1;
      return { ...task, startTime: now - PANEL_STEP_S * started };
    }),
  };
  return `${JSON.stringify(staggered, null, 2)}\n`;
}

// A capture renders verbatim; a shipped fixture is anchored to the render
// moment and pointed at a freshly materialized demo repo so the git segments
// preview. The repo is torn down with the preview's last render.
export function previewSources(home: string, now: number): PreviewSources {
  const mainCapture = capturePath(home, 'main');
  if (existsSync(mainCapture)) {
    const tickCapture = capturePath(home, 'tick');
    return {
      cleanup: () => undefined,
      main: readFileSync(mainCapture, 'utf8'),
      tick: existsSync(tickCapture)
        ? readFileSync(tickCapture, 'utf8')
        : anchoredTick(now),
    };
  }
  const demoHome = mkdtempSync(join(tmpdir(), 'statusline-preview-'));
  return {
    cleanup: () => {
      rmSync(demoHome, { recursive: true, force: true });
    },
    main: anchoredP1(materializeDemoRepo(demoHome), now),
    tick: anchoredTick(now),
  };
}

// The panel answers with one {"id","content"} JSON line per task; a frame
// carries the first row's content.
function firstPanelRow(output: string): string {
  const [row] = output.split('\n');
  if (row === '') {
    return '';
  }
  const content = (JSON.parse(row) as { content?: unknown }).content;
  return typeof content === 'string' ? content : '';
}

export interface PreviewRender {
  readonly home: string;
  readonly layout?: string;
  readonly main: string;
  readonly now: string;
  readonly plain?: boolean;
  readonly theme?: string;
  readonly tick: string;
  readonly values?: Readonly<Record<string, string>>;
  readonly width?: number;
}

export interface PreviewSurfaces {
  readonly line: string;
  readonly panel: string;
}

// Both surfaces render in-process from one resolution — theme plus overrides
// resolve exactly as the render entry does at paint, then feed the packaged
// engine and panel. The panel reads its width from the tick's own columns;
// the line reads the bag's.
export function renderPreview(bag: PreviewRender): PreviewSurfaces {
  const plain = bag.plain === true || (process.env.NO_COLOR ?? '') !== '';
  const paint = resolvePaint({
    layout: bag.layout,
    picks: bag.values,
    theme: bag.theme,
  });
  const line = renderStatusline({
    home: bag.home,
    layout: paint.layout,
    noColor: plain,
    now: Number(bag.now),
    payload: bag.main,
    picks: paint.picks,
    timeZone: 'UTC',
    ...(bag.width === undefined ? {} : { columns: bag.width }),
  }).replace(/\n+$/, '');
  const panel = firstPanelRow(
    renderPanel({
      noColor: plain,
      now: Number(bag.now),
      payload: bag.tick,
      picks: paint.picks,
    }).replace(/\n+$/, ''),
  );
  return { line, panel };
}
