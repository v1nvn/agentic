/**
 * The tokens mod: a status line carrying the rolling 24h slice under the
 * prompt, and /tokens opening the report as a pane. Islands draw, processes
 * compute — the island never reads transcripts ($.fs.read caps at 4 MiB);
 * every number is one exec of the shipped CLI (bin/report.mjs --json) through
 * the session's Bash tool, the same binary `npx tokens-report` runs.
 */

import { atom, read, update } from 'claude-code';

import type { ScanResult } from '../src/aggregate.js';

import { hitRate, sumRows, totalTokens } from '../src/aggregate.js';
import { render } from '../src/format.js';
import { fmtTokens, ymd } from '../src/text.js';

import type { EngineInterface, On } from 'claude-code';

const PANE = 'tokens-usage';
const REFRESH_MS = 5 * 60 * 1000;
const usage = atom(
  { plugin: 'tokens', key: 'usage' } as const,
  null as null | ScanResult,
);

/** One CLI exec, parsed; null when it was refused, failed or answered nothing. */
async function scanUsage($: EngineInterface): Promise<null | ScanResult> {
  try {
    const call = await $.tool.call({
      tool: 'Bash',
      command: `node ${$.plugin.root}/bin/report.mjs --json`,
    });
    if (call.deny !== undefined || typeof call.result !== 'object') {
      return null;
    }
    const { stdout } = call.result as { stdout?: unknown };
    const parsed = JSON.parse(
      typeof stdout === 'string' ? stdout : '',
    ) as ScanResult;
    return Array.isArray(parsed.days) ? parsed : null;
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
  const s = await scanUsage($);
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
    const { Text } = $.ui.resolve(e);
    const s = await read($, usage);
    return <Text>{s ? render(s) : '(no usage report)'}</Text>;
  });
}
