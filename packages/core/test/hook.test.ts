import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitHookBlock, readHookEvent, replyTarget } from '../src/hook.js';

describe('readHookEvent', () => {
  it('parses the hook event JSON from the stream', async () => {
    const stream = new PassThrough();
    const promise = readHookEvent(stream);
    stream.end('{"session_id":"abc","transcript_path":"/tmp/x.jsonl"}');
    expect(await promise).toEqual({ session_id: 'abc', transcript_path: '/tmp/x.jsonl' });
  });

  it('yields an empty event for empty or unparseable stdin', async () => {
    const empty = new PassThrough();
    const p1 = readHookEvent(empty);
    empty.end('');
    expect(await p1).toEqual({});

    const garbage = new PassThrough();
    const p2 = readHookEvent(garbage);
    garbage.end('not json');
    expect(await p2).toEqual({});
  });
});

describe('replyTarget', () => {
  const dir = mkdtempSync(join(tmpdir(), 'core-hook-'));

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('prefers transcript_path when it names a real file', () => {
    const file = join(dir, 'session.jsonl');
    writeFileSync(file, '{}');
    expect(
      replyTarget({ transcript_path: file, session_id: 'sid' }),
    ).toBe(file);
  });

  it('falls back to session_id when the transcript path is not a file', () => {
    expect(
      replyTarget({ transcript_path: '/nonexistent/x.jsonl', session_id: 'sid' }),
    ).toBe('sid');
  });

  it('yields nothing for an empty event or blank session id', () => {
    expect(replyTarget({})).toBeUndefined();
    expect(replyTarget({ session_id: '' })).toBeUndefined();
  });
});

describe('emitHookBlock', () => {
  it('prints one JSON line blocking the command with the output as reason', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    emitHookBlock('line one\nline two');
    expect(write).toHaveBeenCalledWith('{"decision":"block","reason":"line one\\nline two"}\n');
    write.mockRestore();
  });
});
