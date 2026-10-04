/**
 * Pure aggregation over transcript JSONL lines — the one usage math shared by
 * the node-fs CLI walk (scan.ts) and the engine-side $.fs walk (register.tsx).
 */

import { ymd } from './text.js';

const DAYS = 7;

export interface UsageAcc {
  cacheCreation: number;
  cacheRead: number;
  calls: number;
  input: number;
  output: number;
}

export interface DayRow extends UsageAcc {
  day: string;
}

export interface ModelRow extends UsageAcc {
  model: string;
}

export interface ScanResult {
  days: DayRow[];
  last24: ModelRow[];
  models: ModelRow[];
  now: string;
}

interface UsageBlock {
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
}

interface TranscriptEntry {
  message?: { model?: string; usage?: UsageBlock };
  timestamp?: string;
}

export function totalTokens(a: UsageAcc): number {
  return (
    (a.input || 0) +
    (a.output || 0) +
    (a.cacheRead || 0) +
    (a.cacheCreation || 0)
  );
}

/** cacheRead / modeled context; input_tokens is uncached input only. */
export function hitRate({
  input = 0,
  cacheRead = 0,
  cacheCreation = 0,
}: Partial<UsageAcc> = {}): number {
  const denom = input + cacheRead + cacheCreation;
  return denom > 0 ? (cacheRead / denom) * 100 : 0;
}

export function sumRows(rows: readonly UsageAcc[]): UsageAcc {
  const sum: UsageAcc = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreation: 0,
    calls: 0,
  };
  for (const r of rows) {
    sum.input += r.input;
    sum.output += r.output;
    sum.cacheRead += r.cacheRead;
    sum.cacheCreation += r.cacheCreation;
    sum.calls += r.calls;
  }
  return sum;
}

/**
 * The day buckets fully inside the 7-day window ending at `now`. The bucket
 * holding the window-start day covers only part of that calendar day — drop
 * it (unless the window began at midnight, which scan bucketed as a full
 * day).
 */
export function last7(scanResult: ScanResult, now: Date): DayRow[] {
  const { days } = scanResult;
  const firstDay = ymd(new Date(now.getTime() - 7 * 24 * 3600 * 1000));
  const first = days.at(0);
  const last = days.at(-1);
  return first && last && first.day === firstDay && firstDay !== last.day
    ? days.slice(1)
    : days;
}

function zero(): UsageAcc {
  return { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, calls: 0 };
}

function add(acc: UsageAcc, u: UsageBlock, n = 1): void {
  acc.input += n * (u.input_tokens ?? 0);
  acc.output += n * (u.output_tokens ?? 0);
  acc.cacheRead += n * (u.cache_read_input_tokens ?? 0);
  acc.cacheCreation += n * (u.cache_creation_input_tokens ?? 0);
  acc.calls += n;
}

function byTotalDesc(a: UsageAcc, b: UsageAcc): number {
  return totalTokens(b) - totalTokens(a);
}

/** Get-or-create the map entry, so callers never hold a missing accumulator. */
function bucket<K>(map: Map<K, UsageAcc>, key: K): UsageAcc {
  let acc = map.get(key);
  if (acc === undefined) {
    acc = zero();
    map.set(key, acc);
  }
  return acc;
}

function toModelRows(m: Map<string, UsageAcc>): ModelRow[] {
  return [...m.entries()]
    .map(([model, acc]) => ({ model, ...acc }))
    .sort(byTotalDesc);
}

export function createAggregator(now = new Date()) {
  const windowStart = now.getTime() - DAYS * 24 * 3600 * 1000;
  const last24Start = now.getTime() - 24 * 3600 * 1000;
  const days = new Map<string, UsageAcc>(); // 'YYYY-MM-DD' → acc
  const last24 = new Map<string, UsageAcc>(); // model → acc
  const models = new Map<string, UsageAcc>(); // model → acc (whole 7d window)

  return {
    /** Files older than this (mtime) cannot hold in-window entries. */
    windowStart,

    /** One JSONL line; lines without an in-window usage block are ignored. */
    addLine(line: string): void {
      if (!line.includes('"usage"')) {
        return;
      }
      let j: TranscriptEntry;
      try {
        j = JSON.parse(line) as TranscriptEntry;
      } catch {
        return;
      }
      const u = j.message?.usage;
      const model = j.message?.model;
      if (!u || !model || !j.timestamp) {
        return;
      }

      const ts = new Date(j.timestamp).getTime();
      if (!(ts >= windowStart)) {
        return;
      }

      add(bucket(days, ymd(new Date(ts))), u);
      add(bucket(models, model), u);
      if (ts >= last24Start) {
        add(bucket(last24, model), u);
      }
    },

    result(): ScanResult {
      return {
        now: now.toISOString(),
        days: [...days.entries()]
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([day, acc]) => ({ day, ...acc })),
        models: toModelRows(models),
        last24: toModelRows(last24),
      };
    },
  };
}
