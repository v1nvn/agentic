import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadConfig } from '../src/config.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('loadConfig', () => {
  it('falls back to loopback defaults', () => {
    const config = loadConfig({});
    expect(config.url).toBe('http://127.0.0.1:8000');
    expect(config.model).toBe('Qwen3.8-27B-oQ4e-mtp');
    expect(config.timeoutMs).toBe(600_000);
  });

  it('strips a trailing slash from OMLX_URL', () => {
    const config = loadConfig({ OMLX_URL: 'http://localhost:9000/' });
    expect(config.url).toBe('http://localhost:9000');
  });

  it('parses OMLX_TIMEOUT_MS and falls back when invalid', () => {
    expect(loadConfig({ OMLX_TIMEOUT_MS: '2500' }).timeoutMs).toBe(2500);
    expect(loadConfig({ OMLX_TIMEOUT_MS: 'nope' }).timeoutMs).toBe(600_000);
    expect(loadConfig({ OMLX_TIMEOUT_MS: '-1' }).timeoutMs).toBe(600_000);
  });

  it('carries server identity for introspection', () => {
    const config = loadConfig({});
    expect(config.name).toBe('omlx-mcp');
    expect(config.title.length).toBeGreaterThan(0);
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.instructions.length).toBeGreaterThan(0);
  });
});
