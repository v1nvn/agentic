import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { askHandler } from '../src/tools/ask.js';
import { jsonResponse, textOf, type FetchStub, stubFetch } from './helpers.js';

// Minimal valid 1x1 PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let stub: FetchStub;
let imageDir: string;

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  stub = stubFetch(() =>
    jsonResponse({
      choices: [{ message: { content: 'the answer', reasoning_content: 'why' } }],
    }),
  );
  imageDir = mkdtempSync(join(tmpdir(), 'omlx-test-'));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  rmSync(imageDir, { recursive: true, force: true });
});

describe('ask', () => {
  it('carries the defaults into the request body', async () => {
    const result = await askHandler({ prompt: 'hi' });
    const body = stub.calls[0]?.body as Record<string, unknown>;
    expect(body).toMatchObject({
      max_tokens: 2048,
      messages: [{ content: 'hi', role: 'user' }],
      model: 'Qwen3.8-27B-oQ4e-mtp',
      reasoning_effort: 'low',
    });
    expect(body).not.toHaveProperty('temperature');
    expect(result.structuredContent).toMatchObject({
      answer: 'the answer',
      model: 'Qwen3.8-27B-oQ4e-mtp',
      reasoning_fallback: false,
    });
  });

  it('honors env and explicit overrides', async () => {
    vi.stubEnv('OMLX_MODEL', 'env-model');
    await askHandler({ prompt: 'hi' });
    expect((stub.calls[0]?.body as Record<string, unknown>).model).toBe(
      'env-model',
    );

    await askHandler({
      model: 'explicit-model',
      prompt: 'hi',
      system: 'be brief',
      temperature: 0.2,
    });
    expect(stub.calls[1]?.body).toMatchObject({
      messages: [
        { content: 'be brief', role: 'system' },
        { content: 'hi', role: 'user' },
      ],
      model: 'explicit-model',
      temperature: 0.2,
    });
  });

  it('converts image paths into base64 content parts with detected MIME', async () => {
    const png = join(imageDir, 'shot.png');
    writeFileSync(png, Buffer.from(PNG_BASE64, 'base64'));
    await askHandler({ images: [png], prompt: 'describe' });
    const messages = (stub.calls[0]?.body as Record<string, unknown>)
      .messages as { content: unknown }[];
    const content = messages[0]?.content as {
      image_url?: { url: string };
      text?: string;
      type: string;
    }[];
    expect(content).toHaveLength(2);
    expect(content[0]).toEqual({ text: 'describe', type: 'text' });
    expect(content[1]?.type).toBe('image_url');
    expect(content[1]?.image_url?.url).toMatch(
      /^data:image\/png;base64,iVBORw0KGgo/,
    );
  });

  it('rejects an image whose bytes are not a known format', async () => {
    const fake = join(imageDir, 'fake.png');
    writeFileSync(fake, Buffer.from('definitely not a png'));
    const result = await askHandler({ images: [fake], prompt: 'describe' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('unsupported image format');
  });

  it('falls back to the reasoning tail when content is empty', async () => {
    const reasoning = 'x'.repeat(3000);
    stubFetch(() =>
      jsonResponse({ choices: [{ message: { content: null, reasoning_content: reasoning } }] }),
    );
    const result = await askHandler({ prompt: 'hi' });
    expect(result.structuredContent).toMatchObject({
      answer: 'x'.repeat(2000),
      reasoning_fallback: true,
    });
  });

  it('returns an error result when omlx is unreachable', async () => {
    const refused = new TypeError('fetch failed');
    (refused as { cause: Error }).cause = Object.assign(new Error('x'), {
      code: 'ECONNREFUSED',
    });
    stubFetch(() => {
      throw refused;
    });
    const result = await askHandler({ prompt: 'hi' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      'omlx unreachable at http://127.0.0.1:8000 (ECONNREFUSED) — start it with: omlx serve',
    );
  });

  it('passes the server detail through on HTTP errors', async () => {
    stubFetch(() => jsonResponse({ detail: 'model not found' }, 404));
    const result = await askHandler({ prompt: 'hi' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toBe(
      'omlx returned 404 for /v1/chat/completions: model not found',
    );
  });

  it('names the timeout remedy', async () => {
    stubFetch(() => {
      const timeout = new Error('aborted');
      timeout.name = 'TimeoutError';
      throw timeout;
    });
    const result = await askHandler({ prompt: 'hi' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('OMLX_TIMEOUT_MS');
  });
});
