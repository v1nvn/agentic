/**
 * Plain-text token-usage renderer.
 *
 * Rendered for a monospace terminal / hook-block `reason`, so it must NOT rely on
 * markdown. Alignment comes from fixed-width columns and unicode block glyphs.
 * Input is the aggregate JSON produced by scan.ts.
 */

import {
  barField,
  fmtNum,
  fmtTokens,
  MONTHS,
  padL,
  padR,
} from '@v1nvn/agentic-core';

import type { DayRow, ModelRow, ScanResult, UsageAcc } from './scan.js';

const W = 68; // overall rule width

/** cacheRead / modeled context; input_tokens is uncached input only. */
export function hitRate({
  input = 0,
  cacheRead = 0,
  cacheCreation = 0,
}: Partial<UsageAcc> = {}): number {
  const denom = input + cacheRead + cacheCreation;
  return denom > 0 ? (cacheRead / denom) * 100 : 0;
}

function totalTokens(a: UsageAcc): number {
  return (
    (a.input || 0) +
    (a.output || 0) +
    (a.cacheRead || 0) +
    (a.cacheCreation || 0)
  );
}

/** '2026-08-15' → 'Aug 15'. */
function dayLabel(day: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return m ? `${MONTHS[+m[2] - 1]} ${m[3]}` : day;
}

function fmtClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Local-time 'YYYY-MM-DD' for a Date, without depending on toLocaleString. */
function localKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function render(
  scanResult: ScanResult,
  { now = new Date() } = {},
): string {
  const out: string[] = [];
  function rule(): string {
    return '─'.repeat(W);
  }

  const allRows: ModelRow[] = scanResult.last24;
  const rows = allRows.filter(r => totalTokens(r) > 0); // <synthetic> etc. carry no tokens
  const sum = rows.reduce<UsageAcc>(
    (a, r) => {
      a.input += r.input;
      a.output += r.output;
      a.cacheRead += r.cacheRead;
      a.cacheCreation += r.cacheCreation;
      a.calls += r.calls;
      return a;
    },
    { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, calls: 0 },
  );
  const pctHit = Math.round(hitRate(sum));

  // ---- header ----
  const left = ' Token usage · transcripts';
  const winStart = new Date(now.getTime() - 24 * 3600 * 1000);
  const win = `${dayLabel(localKey(winStart))} ${fmtClock(winStart)} → ${dayLabel(localKey(now))} ${fmtClock(now)} · 24h`;
  out.push(rule());
  out.push(left + padL(win, W - left.length));
  out.push(rule());

  // ---- lead ----
  out.push('');
  out.push(
    ` ${fmtTokens(totalTokens(sum))} tokens across ${fmtNum(sum.calls)} model calls — ${pctHit}% cache hit rate.`,
  );

  // ---- model mix · last 24h ----
  out.push('');
  out.push(' Model mix · last 24h ' + '─'.repeat(Math.max(0, W - 22)));
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

  // ---- daily · last 7 days ----
  // The bucket holding the window-start day covers only part of that calendar
  // day — drop it (unless the window began at midnight, which scan would have
  // bucketed as a full day).
  let days: DayRow[] = scanResult.days;
  const firstDay = localKey(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  if (
    days.length &&
    days[0].day === firstDay &&
    firstDay !== days[days.length - 1].day
  ) {
    days = days.slice(1);
  }
  out.push('');
  out.push(' Daily · last 7 days ' + '─'.repeat(Math.max(0, W - 21)));
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
