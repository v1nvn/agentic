/**
 * Transcript token scanner.
 *
 * Claude Code persists every assistant message's `usage` block to session
 * transcripts at ~/.claude/projects/<project-dir>/<session>.jsonl — for every
 * profile (default claude, claudez, …), interactive and headless alike. This
 * scans those files and aggregates token usage per model and per local day:
 * input (uncached), output, cacheRead, cacheCreation, call count.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
  return (
    b.input +
    b.output +
    b.cacheRead +
    b.cacheCreation -
    (a.input + a.output + a.cacheRead + a.cacheCreation)
  );
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

export function scan({
  projectsDir,
  now = new Date(),
}: { now?: Date; projectsDir?: string } = {}): ScanResult {
  const dir = projectsDir ?? join(homedir(), '.claude', 'projects');
  if (!existsSync(dir)) {
    throw new Error(`no transcripts directory at ${dir}`);
  }

  const windowStart = now.getTime() - DAYS * 24 * 3600 * 1000;
  const last24Start = now.getTime() - 24 * 3600 * 1000;

  const days = new Map<string, UsageAcc>(); // 'YYYY-MM-DD' → acc
  const last24 = new Map<string, UsageAcc>(); // model → acc
  const models = new Map<string, UsageAcc>(); // model → acc (whole 7d window, for the model mix)

  const projectDirs = readdirSync(dir)
    .map(d => join(dir, d))
    .filter(d => statSync(d).isDirectory());

  for (const pdir of projectDirs) {
    for (const f of readdirSync(pdir)) {
      if (!f.endsWith('.jsonl')) {
        continue;
      }
      const fp = join(pdir, f);
      if (statSync(fp).mtimeMs < windowStart) {
        continue;
      }

      for (const line of readFileSync(fp, 'utf8').split('\n')) {
        if (!line.includes('"usage"')) {
          continue;
        }
        let j: TranscriptEntry;
        try {
          j = JSON.parse(line) as TranscriptEntry;
        } catch {
          continue;
        }
        const u = j.message?.usage;
        const model = j.message?.model;
        if (!u || !model || !j.timestamp) {
          continue;
        }

        const ts = new Date(j.timestamp).getTime();
        if (!(ts >= windowStart)) {
          continue;
        }

        const local = new Date(ts);
        const dayKey = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        add(bucket(days, dayKey), u);
        add(bucket(models, model), u);
        if (ts >= last24Start) {
          add(bucket(last24, model), u);
        }
      }
    }
  }

  return {
    now: now.toISOString(),
    days: [...days.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([day, acc]) => ({ day, ...acc })),
    models: toModelRows(models),
    last24: toModelRows(last24),
  };
}
