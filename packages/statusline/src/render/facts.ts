import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { isRecord } from './jq.ts';

// Two facts the tick under-reports, read off each subagent's own transcript:
// used context (the tick's tokenCount is an output-flavored figure, 406
// observed against a real 36,820) and the effort the run is actually at —
// the tick's task.effort is the launch's explicit ask only, absent when the
// effort is inherited. Both sit on the last usage line: tokens as input +
// cache read + cache write (the main line's total_input_tokens arithmetic),
// effort as the line's top-level field, the effective level as sent. Retire
// the tokens half when tokenCount matches its docs.

// One read window per task: the tail of the transcript, wide enough to hold
// the tool results that can sit between a subagent's usage lines.
const TAIL_BYTES = 1 << 20;

function intOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export interface TaskFacts {
  readonly effort: string;
  readonly tokens: number;
}

function lastFacts(fd: number): null | TaskFacts {
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
      const effort =
        isRecord(entry) && typeof entry.effort === 'string' ? entry.effort : '';
      return { effort, tokens };
    }
  }
  return null;
}

// A session's subagent transcripts sit beside its own jsonl, in the
// session-id directory named after it: <project>/<session>.jsonl and
// <project>/<session>/subagents/agent-<task id>.jsonl.
function taskFacts(transcriptPath: string, id: string): null | TaskFacts {
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
    return lastFacts(fd);
  } finally {
    closeSync(fd);
  }
}

export function transcriptFacts(payload: string): Record<string, TaskFacts> {
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
  const map: Record<string, TaskFacts> = {};
  for (const task of tasks) {
    if (!isRecord(task) || typeof task.id !== 'string') {
      continue;
    }
    const facts = taskFacts(transcriptPath, task.id);
    if (facts !== null) {
      map[task.id] = facts;
    }
  }
  return map;
}
