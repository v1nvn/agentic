import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

import { MISSING_SETTINGS } from './helpers.js';

let settingsDir: string;

beforeEach(() => {
  settingsDir = mkdtempSync(join(tmpdir(), 'omlx-settings-'));
});

afterEach(() => {
  rmSync(settingsDir, { recursive: true, force: true });
});

function writeSettings(json: string): string {
  const path = join(settingsDir, 'settings.json');
  writeFileSync(path, json);
  return path;
}

describe('loadConfig', () => {
  it('falls back to loopback defaults when no layer applies', () => {
    const config = loadConfig({
      OMLX_SETTINGS: join(settingsDir, 'missing.json'),
    });
    expect(config.url).toBe('http://127.0.0.1:6659');
    expect(config.model).toBe('Qwen3.8-27B-oQ4e-mtp');
    expect(config.timeoutMs).toBe(600_000);
    expect(config.apiKey).toBeUndefined();
  });

  it('takes url and api key from the settings file', () => {
    const settings = writeSettings(
      JSON.stringify({
        auth: { api_key: 'omlx-from-settings' },
        server: { host: '127.0.0.1', port: 6659 },
      }),
    );
    const config = loadConfig({ OMLX_SETTINGS: settings });
    expect(config.url).toBe('http://127.0.0.1:6659');
    expect(config.apiKey).toBe('omlx-from-settings');
  });

  it('prefers env over the settings file', () => {
    const settings = writeSettings(
      JSON.stringify({
        auth: { api_key: 'omlx-from-settings' },
        server: { host: '10.1.2.3', port: 7000 },
      }),
    );
    const config = loadConfig({
      OMLX_API_KEY: 'omlx-from-env',
      OMLX_SETTINGS: settings,
      OMLX_URL: 'http://localhost:9000/',
    });
    expect(config.url).toBe('http://localhost:9000');
    expect(config.apiKey).toBe('omlx-from-env');
  });

  it('ignores unusable settings values and unparseable files', () => {
    const partial = loadConfig({
      OMLX_SETTINGS: writeSettings(
        JSON.stringify({ server: { host: '10.1.2.3', port: 'nope' } }),
      ),
    });
    expect(partial.url).toBe('http://127.0.0.1:6659');
    expect(partial.apiKey).toBeUndefined();

    const corrupt = loadConfig({
      OMLX_SETTINGS: writeSettings('{not json'),
    });
    expect(corrupt.url).toBe('http://127.0.0.1:6659');
    expect(corrupt.apiKey).toBeUndefined();
  });

  it('strips a trailing slash from OMLX_URL', () => {
    const config = loadConfig({
      OMLX_SETTINGS: join(settingsDir, 'missing.json'),
      OMLX_URL: 'http://localhost:9000/',
    });
    expect(config.url).toBe('http://localhost:9000');
  });

  it('parses OMLX_TIMEOUT_MS and falls back when invalid', () => {
    const env = { OMLX_SETTINGS: MISSING_SETTINGS };
    expect(loadConfig({ ...env, OMLX_TIMEOUT_MS: '2500' }).timeoutMs).toBe(2500);
    expect(loadConfig({ ...env, OMLX_TIMEOUT_MS: 'nope' }).timeoutMs).toBe(
      600_000,
    );
    expect(loadConfig({ ...env, OMLX_TIMEOUT_MS: '-1' }).timeoutMs).toBe(
      600_000,
    );
  });

  it('carries server identity for introspection', () => {
    const config = loadConfig({ OMLX_SETTINGS: MISSING_SETTINGS });
    expect(config.name).toBe('omlx-mcp');
    expect(config.title.length).toBeGreaterThan(0);
    expect(config.description.length).toBeGreaterThan(0);
    expect(config.instructions.length).toBeGreaterThan(0);
  });
});
