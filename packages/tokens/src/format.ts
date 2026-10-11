/**
 * Token-usage report layout: `reportLines` lays the report out once as
 * ink-tagged segments (the mod's pane draws those), and `render` joins them
 * into the CLI's monospace terminal bytes. Input is the ScanResult from
 * aggregate.ts; the line model and fixed-width primitives live in text.ts.
 */

import type { ScanResult } from './aggregate.js';
import type { Line } from './text.js';

import { hitRate, last7, sumRows, totalTokens } from './aggregate.js';
import {
  barField,
  bold,
  dayLabel,
  dim,
  fmtClock,
  fmtNum,
  fmtTokens,
  padL,
  padR,
  plain,
  renderLines,
  rule,
  RULE_WIDTH,
  ymd,
} from './text.js';

export function reportLines(
  scanResult: ScanResult,
  { now = new Date() } = {},
): Line[] {
  const out: Line[] = [];

  const rows = scanResult.last24.filter(r => totalTokens(r) > 0);
  const sum = sumRows(rows);
  const pctHit = Math.round(hitRate(sum));

  const left = ' Token usage · transcripts';
  const winStart = new Date(now.getTime() - 24 * 3600 * 1000);
  const win = `${dayLabel(ymd(winStart))} ${fmtClock(winStart)} → ${dayLabel(ymd(now))} ${fmtClock(now)} · 24h`;
  out.push([plain(rule())]);
  out.push([bold(left), dim(padL(win, RULE_WIDTH - left.length))]);
  out.push([plain(rule())]);

  out.push([]);
  out.push([
    plain(
      ` ${fmtTokens(totalTokens(sum))} tokens across ${fmtNum(sum.calls)} model calls — `,
    ),
    bold(`${pctHit}%`),
    plain(' cache hit rate.'),
  ]);

  out.push([]);
  out.push([
    dim(' Model mix · last 24h ' + '─'.repeat(Math.max(0, RULE_WIDTH - 22))),
  ]);
  if (rows.length === 0) {
    out.push([plain('   (no usage recorded in the last 24 hours)')]);
  }
  for (const r of rows) {
    const pct = Math.round(hitRate(r));
    out.push([
      plain(`   ${padR(r.model, 14)}${padL(fmtTokens(r.input), 8)} `),
      dim('in'),
      plain(` · ${padL(fmtTokens(r.output), 8)} `),
      dim('out'),
      plain(` · ${padL(fmtTokens(r.cacheRead), 8)} `),
      dim('read'),
      plain(` · ${padL(fmtTokens(r.cacheWrite), 8)} `),
      dim('cache-write'),
      plain('  '),
      bold(padL(`${pct}%`, 4)),
      plain(` ${barField(pct, 100, 14)}`),
    ]);
  }

  const days = last7(scanResult, now);
  out.push([]);
  out.push([
    dim(' Daily · last 7 days ' + '─'.repeat(Math.max(0, RULE_WIDTH - 21))),
  ]);
  const maxDay = Math.max(0, ...days.map(totalTokens));
  for (const d of [...days].reverse()) {
    const pct = Math.round(hitRate(d));
    out.push([
      plain(
        `   ${dayLabel(d.day)}  ${padL(fmtTokens(totalTokens(d)), 8)}  ${barField(totalTokens(d), maxDay, 24)}  `,
      ),
      bold(padL(`${pct}%`, 4)),
    ]);
  }
  if (days.length === 0) {
    out.push([plain('   (no usage recorded in the last 7 days)')]);
  }

  out.push([]);
  out.push([
    dim(
      ' Covers every profile writing to ~/.claude/projects — hit rate = read / (in + read + cache-write).',
    ),
  ]);
  out.push([plain(rule())]);
  return out;
}

export function render(
  scanResult: ScanResult,
  { now = new Date() } = {},
): string {
  return renderLines(reportLines(scanResult, { now }));
}
