import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { askStructuredHandler } from '../src/tools/ask_structured.js';
import { type FetchStub, jsonResponse, stubFetch, textOf } from './helpers.js';

let stub: FetchStub;

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  stub = stubFetch(() =>
    jsonResponse({ choices: [{ message: { content: '{"files":["a.ts"]}' } }] }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('ask_structured', () => {
  it('sends the schema as a json_schema response_format', async () => {
    const schema = {
      properties: { files: { items: { type: 'string' }, type: 'array' } },
      required: ['files'],
      type: 'object',
    };
    const result = await askStructuredHandler({ prompt: 'list files', schema });
    expect(stub.calls[0]?.body).toMatchObject({
      response_format: {
        json_schema: { name: 'response', schema },
        type: 'json_schema',
      },
    });
    expect(result.structuredContent).toEqual({
      model: 'Qwen3.8-27B-oQ4e-mtp',
      reasoning_fallback: false,
      result: { files: ['a.ts'] },
    });
    expect(textOf(result)).toBe('{\n  "files": [\n    "a.ts"\n  ]\n}');
  });

  it('passes schema_name through to the wire', async () => {
    await askStructuredHandler({
      prompt: 'x',
      schema: { type: 'object' },
      schema_name: 'frontmatter',
    });
    expect(
      (
        (stub.calls[0]?.body as Record<string, unknown>).response_format as {
          json_schema: { name: string };
        }
      ).json_schema.name,
    ).toBe('frontmatter');
  });

  it('surfaces non-JSON output with the raw excerpt', async () => {
    stubFetch(() =>
      jsonResponse({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] }),
    );
    const result = await askStructuredHandler({
      prompt: 'x',
      schema: { type: 'object' },
    });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('non-JSON despite json_schema');
    expect(textOf(result)).toContain('```json');
  });
});
