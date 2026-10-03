/**
 * The tokens mod: a status line carrying the rolling 24h slice under the
 * prompt, and /tokens opening the report as a pane. None of it is model-read —
 * the surfaces stay zero-token; the npx CLI remains the terminal door.
 */

import { atom, read, update } from 'claude-code';

import type { ScanResult } from './aggregate.js';

import {
  createAggregator,
  hitRate,
  sumRows,
  totalTokens,
} from './aggregate.js';
import { render } from './format.js';
import { fmtTokens, ymd } from './text.js';

import type { EngineInterface, On } from 'claude-code';

const PANE = 'tokens-usage';
const REFRESH_MS = 5 * 60 * 1000;
const FENCE = '```';
const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | ScanResult,
);

async function projectsDir($: EngineInterface): Promise<string> {
  const claudeDir =
    (await $.env.get('CLAUDE_DIR')) ?? `${await $.env.get('HOME')}/.claude`;
  return `${claudeDir}/projects`;
}

/** The same walk scan.ts does, against $.fs; null when there is nothing. */
async function scanTranscripts($: EngineInterface): Promise<null | ScanResult> {
  try {
    const dir = await projectsDir($);
    const agg = createAggregator(new Date());
    for (const project of await $.fs.list(dir)) {
      if (project.kind !== 'dir') {
        continue;
      }
      for (const entry of await $.fs.list(`${dir}/${project.name}`)) {
        if (entry.kind !== 'file' || !entry.name.endsWith('.jsonl')) {
          continue;
        }
        if (entry.mtimeMs < agg.windowStart) {
          continue;
        }
        const text = await $.fs.read(`${dir}/${project.name}/${entry.name}`);
        for (const line of text.split('\n')) {
          agg.addLine(line);
        }
      }
    }
    return agg.result();
  } catch {
    return null;
  }
}

function statusLine(s: null | ScanResult): string | undefined {
  if (!s) {
    return undefined;
  }
  const sum = sumRows(s.last24.filter(r => totalTokens(r) > 0));
  const head = `tokens 24h ${fmtTokens(totalTokens(sum))} · ${Math.round(hitRate(sum))}% hit`;
  const today = s.days.find(d => d.day === ymd(new Date(s.now)));
  return today && totalTokens(today) > 0
    ? `${head} · today ${fmtTokens(totalTokens(today))}`
    : head;
}

async function refresh($: EngineInterface): Promise<void> {
  const s = await scanTranscripts($);
  await update($, usage, () => s);
  $.ui.status(statusLine(s));
}

export function register(on: On): void {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens',
      description:
        'Token usage — per-model 24h mix and 7-day dailies, as a pane',
    });
    void refresh($);
    $.clock.every(REFRESH_MS, () => void refresh($));
    return next(e);
  });

  on('command.run', { command: 'tokens' }, async $ => {
    await refresh($);
    await $.ui.open({ id: PANE, title: 'Token usage' });
    return {};
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Markdown } = $.ui.resolve(e);
    const s = await read($, usage);
    const body = s
      ? render(s)
      : '(no transcripts found under $CLAUDE_DIR/projects)';
    return <Markdown text={`${FENCE}\n${body}\n${FENCE}`} />;
  });
}
