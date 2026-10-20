import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { scan } from './scan.ts';
import { ymd } from './text.ts';

const root = mkdtempSync(join(tmpdir(), 'tokens-scan-'));
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function line(
  id: string | undefined,
  model: string,
  ts: string,
  u: Record<string, number>,
): string {
  const message: Record<string, unknown> = { model, usage: u };
  if (id !== undefined) {
    message.id = id;
  }
  return JSON.stringify({ type: 'assistant', timestamp: ts, message });
}

describe('scan', () => {
  it('counts one streamed response once, follows resumes, and reads subagent transcripts', () => {
    const now = new Date();
    const ts = now.toISOString();
    const proj = join(root, 'proj-a');
    const subagents = join(proj, 's1', 'subagents');
    mkdirSync(subagents, { recursive: true });

    function streamed(output: number): string {
      return line('m1', 'glm-5.3', ts, {
        input_tokens: 3,
        cache_read_input_tokens: 50_000,
        output_tokens: output,
      });
    }
    writeFileSync(
      join(proj, 's1.jsonl'),
      [
        streamed(10),
        streamed(10),
        streamed(85),
        line('m2', 'glm-5.3', ts, { input_tokens: 5, output_tokens: 100 }),
        line(undefined, 'glm-5.3', ts, { input_tokens: 11, output_tokens: 50 }),
      ].join('\n'),
    );
    writeFileSync(join(proj, 's2.jsonl'), streamed(85));
    writeFileSync(
      join(subagents, 'agent-x.jsonl'),
      [
        line('m3', 'claude-haiku-5-5', ts, {
          input_tokens: 7,
          output_tokens: 40,
        }),
        line('m3', 'claude-haiku-5-5', ts, {
          input_tokens: 7,
          output_tokens: 900,
        }),
      ].join('\n'),
    );
    writeFileSync(join(subagents, 'agent-x.meta.json'), '{}');

    const { days, models } = scan({ projectsDir: root, now });

    expect(models).toEqual([
      {
        model: 'glm-5.3',
        input: 19,
        output: 235,
        cacheRead: 50_000,
        cacheWrite: 0,
        calls: 3,
      },
      {
        model: 'claude-haiku-5-5',
        input: 7,
        output: 900,
        cacheRead: 0,
        cacheWrite: 0,
        calls: 1,
      },
    ]);
    expect(days).toEqual([
      {
        day: ymd(now),
        input: 26,
        output: 1135,
        cacheRead: 50_000,
        cacheWrite: 0,
        calls: 4,
      },
    ]);
  });
});
