/**
 * Plain-text token-usage renderer — the CLI's surface (`npx tokens-report`).
 * Rendered for a monospace terminal, so it must NOT rely on markdown.
 * Alignment comes from fixed-width columns and unicode block glyphs. Input is
 * the ScanResult produced by the aggregator; the math lives in aggregate.ts,
 * the primitives in text.ts. The mod's pane draws the same scan as an
 * element tree in hooks/register.tsx.
 */

import type { DayRow, ModelRow, ScanResult } from './aggregate.js';

import { hitRate, last7, sumRows, totalTokens } from './aggregate.js';
import {
  barField,
  dayLabel,
  fmtClock,
  fmtNum,
  fmtTokens,
  padL,
  padR,
  rule,
  RULE_WIDTH,
  ymd,
} from './text.js';

export function render(
  scanResult: ScanResult,
  { now = new Date() } = {},
): string {
  const out: string[] = [];

  const allRows: ModelRow[] = scanResult.last24;
  const rows = allRows.filter(r => totalTokens(r) > 0); // <synthetic> etc. carry no tokens
  const sum = sumRows(rows);
  const pctHit = Math.round(hitRate(sum));

  const left = ' Token usage · transcripts';
  const winStart = new Date(now.getTime() - 24 * 3600 * 1000);
  const win = `${dayLabel(ymd(winStart))} ${fmtClock(winStart)} → ${dayLabel(ymd(now))} ${fmtClock(now)} · 24h`;
  out.push(rule());
  out.push(left + padL(win, RULE_WIDTH - left.length));
  out.push(rule());

  out.push('');
  out.push(
    ` ${fmtTokens(totalTokens(sum))} tokens across ${fmtNum(sum.calls)} model calls — ${pctHit}% cache hit rate.`,
  );

  out.push('');
  out.push(' Model mix · last 24h ' + '─'.repeat(Math.max(0, RULE_WIDTH - 22)));
  if (rows.length === 0) {
    out.push('   (no usage recorded in the last 24 hours)');
  }
  for (const r of rows) {
    const pct = Math.round(hitRate(r));
    out.push(
      `   ${padR(r.model, 14)}${padL(fmtTokens(r.input), 8)} in · ${padL(fmtTokens(r.output), 8)} out ·` +
        ` ${padL(fmtTokens(r.cacheRead), 8)} read · ${padL(fmtTokens(r.cacheCreation), 8)} created  ${padL(`${pct}%`, 4)} ${barField(pct, 100, 14)}`,
    );
  }

  const days: DayRow[] = last7(scanResult, now);
  out.push('');
  out.push(' Daily · last 7 days ' + '─'.repeat(Math.max(0, RULE_WIDTH - 21)));
  const maxDay = Math.max(0, ...days.map(totalTokens));
  for (const d of [...days].reverse()) {
    const pct = Math.round(hitRate(d));
    out.push(
      `   ${dayLabel(d.day)}  ${padL(fmtTokens(totalTokens(d)), 8)}  ${barField(totalTokens(d), maxDay, 24)}  ${padL(`${pct}%`, 4)}`,
    );
  }
  if (days.length === 0) {
    out.push('   (no usage recorded in the last 7 days)');
  }

  out.push('');
  out.push(
    ` Covers every profile writing to ~/.claude/projects — hit rate = read / (in + read + created).`,
  );
  out.push(rule());
  return out.join('\n');
}
