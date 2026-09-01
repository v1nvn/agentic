import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scan } from '../src/scan.js';

const now = new Date('2026-08-15T09:41:00');

let projects: string | undefined;

beforeEach(() => {
  projects = mkdtempSync(join(tmpdir(), 'tokens-scan-'));
});

afterEach(() => {
  if (projects) rmSync(projects, { recursive: true, force: true });
});

function writeTranscript(project: string, session: string, entries: unknown[], mtime?: Date): void {
  const dir = join(projects!, project);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${session}.jsonl`);
  writeFileSync(file, entries.map((e) => JSON.stringify(e)).join('\n') + '\n');
  if (mtime) utimesSync(file, mtime, mtime);
}

const usage = (model: string, u: Record<string, number>, timestamp: string) => ({
  type: 'assistant',
  timestamp,
  message: { model, usage: u },
});

describe('scan', () => {
  it('aggregates per model and per local day, and splits out the last 24h', () => {
    writeTranscript('-work-proj', 'aaa', [
      { type: 'user', message: { content: 'q' } }, // no usage block → skipped
      usage('glm-5.3', { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 1000 }, '2026-08-15T04:00:00Z'),
      usage('glm-5.3', { input_tokens: 50, output_tokens: 5, cache_read_input_tokens: 500, cache_creation_input_tokens: 200 }, '2026-08-15T05:00:00Z'),
      usage('claude-opus-5', { input_tokens: 900, cache_read_input_tokens: 300 }, '2026-08-13T12:00:00Z'), // > 24h ago, inside 7d
    ]);

    const result = scan({ projectsDir: projects, now });

    expect(result.models).toHaveLength(2);
    const glm = result.models.find((m) => m.model === 'glm-5.3')!;
    expect(glm.calls).toBe(2);
    expect(glm.input).toBe(150);
    expect(glm.cacheRead).toBe(1500);

    // only glm-5.3 entries fall inside the last 24h
    expect(result.last24.map((m) => m.model)).toEqual(['glm-5.3']);

    // one local-day bucket per calendar day of the entries
    expect(result.days.length).toBeGreaterThanOrEqual(2);
  });

  it('skips files whose mtime predates the 7-day window', () => {
    writeTranscript(
      '-old-proj',
      'ancient',
      [usage('glm-5.3', { input_tokens: 100 }, '2026-08-15T04:00:00Z')],
      new Date('2026-07-01T00:00:00Z'),
    );
    const result = scan({ projectsDir: projects, now });
    expect(result.models).toHaveLength(0);
  });

  it('survives malformed JSONL lines', () => {
    const dir = join(projects!, '-work-proj');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'mixed.jsonl'), [
      'not json at all',
      JSON.stringify(usage('glm-5.3', { input_tokens: 7 }, '2026-08-15T04:00:00Z')),
    ].join('\n'));
    const result = scan({ projectsDir: projects, now });
    expect(result.models[0].input).toBe(7);
  });

  it('throws when the transcripts directory is missing', () => {
    expect(() => scan({ projectsDir: '/nonexistent/projects', now })).toThrow(
      'no transcripts directory at /nonexistent/projects',
    );
  });
});
