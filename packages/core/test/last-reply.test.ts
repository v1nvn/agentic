import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { lastReply } from '../src/last-reply.js';

const assistant = (blocks: unknown[]) =>
  JSON.stringify({ type: 'assistant', message: { content: blocks } });
const text = (t: string) => ({ type: 'text', text: t });

let claudeDir: string | undefined;

beforeEach(() => {
  claudeDir = mkdtempSync(join(tmpdir(), 'core-last-reply-'));
  process.env.CLAUDE_DIR = claudeDir;
  process.env.CLAUDE_PROJECT_DIR = '/work/proj';
});

afterEach(() => {
  if (claudeDir) rmSync(claudeDir, { recursive: true, force: true });
  delete process.env.CLAUDE_DIR;
  delete process.env.CLAUDE_PROJECT_DIR;
});

function writeSession(name: string, lines: string[], mtime: Date): string {
  // /work/proj keys to -work-proj, matching Claude Code's transcript layout.
  const projDir = join(claudeDir!, 'projects', '-work-proj');
  mkdirSync(projDir, { recursive: true });
  const file = join(projDir, name);
  writeFileSync(file, lines.join('\n') + '\n');
  utimesSync(file, mtime, mtime);
  return file;
}

describe('lastReply', () => {
  it('reproduces /copy: last text-bearing assistant, text blocks only, blank-line join, no trailing newline', () => {
    writeSession(
      'live.jsonl',
      [
        JSON.stringify({ type: 'user', message: { content: 'question' } }),
        assistant([text('first reply')]),
        assistant([{ type: 'tool_use', name: 'Bash' }]),
        assistant([text('part one'), text('part two')]),
        assistant([{ type: 'thinking', thinking: '…' }]),
      ],
      new Date(),
    );

    expect(lastReply()).toBe('part one\n\npart two');
  });

  it('returns empty output when no assistant entry carries a text block', () => {
    writeSession('live.jsonl', [assistant([{ type: 'tool_use' }])], new Date());
    expect(lastReply()).toBe('');
  });

  it('resolves a session UUID to projects/<proj>/<uuid>.jsonl', () => {
    writeSession(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jsonl',
      [assistant([text('by id')])],
      new Date('2026-01-01T12:00:00Z'),
    );
    expect(lastReply('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe('by id');
  });

  it('prefers an explicit transcript file when the path exists', () => {
    const explicit = writeSession(
      'older.jsonl',
      [assistant([text('from explicit file')])],
      new Date('2026-01-01T12:00:00Z'),
    );
    writeSession('newest.jsonl', [assistant([text('newest session')])], new Date());
    expect(lastReply(explicit)).toBe('from explicit file');
  });

  it('falls back to the newest session for the current project', () => {
    writeSession('older.jsonl', [assistant([text('older')])], new Date('2026-01-01T12:00:00Z'));
    writeSession('newest.jsonl', [assistant([text('newest')])], new Date('2026-09-01T12:00:00Z'));
    expect(lastReply()).toBe('newest');
  });

  it('fails with the project dir when no transcript matches', () => {
    expect(() => lastReply('no-such-session')).toThrow(
      `no session transcript found in ${join(claudeDir!, 'projects', '-work-proj')}`,
    );
  });
});
