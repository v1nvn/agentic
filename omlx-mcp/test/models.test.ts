import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { modelsHandler } from '../src/tools/models.js';
import { type FetchStub, jsonResponse, stubFetch, textOf } from './helpers.js';

let stub: FetchStub;

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubModelEndpoints(): void {
  stub = stubFetch(call => {
    if (call.url.endsWith('/v1/models/status')) {
      return jsonResponse({
        loaded_count: 1,
        model_count: 2,
        models: [
          {
            engine_type: 'vlm',
            estimated_size: 17_820_265_635,
            id: 'Qwen3.8-27B-oQ4e-mtp',
            is_loading: false,
            loaded: true,
            max_context_window: 262_144,
            max_tokens: 32_768,
          },
          {
            engine_type: 'embedding',
            estimated_size: 1_200_000_000,
            id: 'AAA-Embed-0.6B',
            is_loading: false,
            loaded: false,
            max_context_window: 32_768,
            max_tokens: null,
          },
        ],
      });
    }
    return jsonResponse({
      data: [{ id: 'Qwen3.8-27B-oQ4e-mtp' }, { id: 'AAA-Embed-0.6B' }],
    });
  });
}

describe('models', () => {
  it('merges both endpoints, sorted by id', async () => {
    stubModelEndpoints();
    const result = await modelsHandler();
    expect(result.structuredContent).toMatchObject({
      loaded_count: 1,
      model_count: 2,
      models: [
        {
          context_window: 32_768,
          engine_type: 'embedding',
          id: 'AAA-Embed-0.6B',
          loaded: false,
          max_output_tokens: null,
          size_bytes: 1_200_000_000,
        },
        {
          context_window: 262_144,
          id: 'Qwen3.8-27B-oQ4e-mtp',
          loaded: true,
          max_output_tokens: 32_768,
        },
      ],
    });
    // Both endpoints were consulted.
    expect(stub.calls.map(call => call.url)).toEqual([
      'http://127.0.0.1:8000/v1/models',
      'http://127.0.0.1:8000/v1/models/status',
    ]);
    expect(textOf(result)).toContain(
      'Qwen3.8-27B-oQ4e-mtp  loaded  vlm  context 262144  out 32768  size 17.8 GB',
    );
  });

  it('keeps list ids visible when status lags the install', async () => {
    stub = stubFetch(call => {
      if (call.url.endsWith('/v1/models/status')) {
        return jsonResponse({ models: [] });
      }
      return jsonResponse({ data: [{ id: 'Fresh-Model' }] });
    });
    const result = await modelsHandler();
    expect(result.structuredContent).toMatchObject({
      models: [
        {
          context_window: null,
          id: 'Fresh-Model',
          loaded: false,
          size_bytes: null,
        },
      ],
    });
  });
});
