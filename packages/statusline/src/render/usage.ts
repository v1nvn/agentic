import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { isRecord } from './jq.js';

// The tick's tokenCount is documented as the subagent's running token count,
// but the engine ships an output-flavored figure there (406 observed against
// a real 36,820), so the panel reads the used context off the subagent's own
// transcript: input + cache read + cache write of its last usage line, the
// same arithmetic as the main line's total_input_tokens. Retire this module
// when tokenCount matches its docs.

// One read window per task: the tail of the transcript, wide enough to hold
// the tool results that can sit between a subagent's usage lines.
const TAIL_BYTES = 1 << 20;

function intOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function lastUsage(fd: number): null | number {
  const size = fstatSync(fd).size;
  const length = Math.min(size, TAIL_BYTES);
  const buffer = Buffer.alloc(length);
  readSync(fd, buffer, 0, length, size - length);
  const lines = buffer.toString('utf8').split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    let entry: unknown;
    try {
      entry = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    const message = isRecord(entry) ? entry.message : undefined;
    const usage = isRecord(message) ? message.usage : undefined;
    if (!isRecord(usage)) {
      continue;
    }
    const tokens =
      intOf(usage.input_tokens) +
      intOf(usage.cache_read_input_tokens) +
      intOf(usage.cache_creation_input_tokens);
    if (tokens > 0) {
      return tokens;
    }
  }
  return null;
}

// A session's subagent transcripts sit beside its own jsonl, in the
// session-id directory named after it: <project>/<session>.jsonl and
// <project>/<session>/subagents/agent-<task id>.jsonl.
function taskUsedContext(transcriptPath: string, id: string): null | number {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return null;
  }
  const session = basename(transcriptPath, '.jsonl');
  const path = join(
    dirname(transcriptPath),
    session,
    'subagents',
    `agent-${id}.jsonl`,
  );
  let fd: number;
  try {
    fd = openSync(path, 'r');
  } catch {
    return null;
  }
  try {
    return lastUsage(fd);
  } finally {
    closeSync(fd);
  }
}

export function usedContextMap(payload: string): Record<string, number> {
  let root: unknown;
  try {
    root = JSON.parse(payload);
  } catch {
    return {};
  }
  const transcriptPath =
    isRecord(root) && typeof root.transcript_path === 'string'
      ? root.transcript_path
      : '';
  const tasks = isRecord(root) && Array.isArray(root.tasks) ? root.tasks : [];
  if (transcriptPath === '') {
    return {};
  }
  const map: Record<string, number> = {};
  for (const task of tasks) {
    if (!isRecord(task) || typeof task.id !== 'string') {
      continue;
    }
    const tokens = taskUsedContext(transcriptPath, task.id);
    if (tokens !== null) {
      map[task.id] = tokens;
    }
  }
  return map;
}
