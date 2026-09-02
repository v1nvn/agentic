import { describe, expect, it } from 'vitest';

import { parseArgs, resolveConfig, USAGE } from '../src/resolve.js';
import type { ParsedArgs } from '../src/resolve.js';

const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;

// The resolve tests only use argv that parses; the parse tests cover the rest.
const args = (argv: string[]): ParsedArgs => parseArgs(argv) as ParsedArgs;

const ZAI_ORIGIN = 'https://api.z.ai';
const BIGMODEL_ORIGIN = 'https://open.bigmodel.cn';

const zaiKey = { ZAI_AUTH_TOKEN: 'zai-key' };
const glmPair = {
  ANTHROPIC_AUTH_TOKEN: 'cc-key',
  ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
};

describe('parseArgs', () => {
  it('parses flags in any order', () => {
    expect(parseArgs(['--base-url', 'https://x', '--auth-token', 't'])).toEqual({
      authToken: 't',
      baseUrl: 'https://x',
      hook: false,
    });
  });

  it('parses --hook', () => {
    expect(parseArgs(['--hook'])).toEqual({
      authToken: undefined,
      baseUrl: undefined,
      hook: true,
    });
  });

  it('accepts no args', () => {
    expect(parseArgs([])).toEqual({
      authToken: undefined,
      baseUrl: undefined,
      hook: false,
    });
  });

  it('rejects a flag with no value', () => {
    expect(parseArgs(['--auth-token'])).toBeUndefined();
  });

  it('rejects a flag-like value', () => {
    expect(parseArgs(['--base-url', '--hook'])).toBeUndefined();
  });

  it('rejects unknown flags', () => {
    expect(parseArgs(['--platform', 'zhipu'])).toBeUndefined();
  });

  it('rejects positionals', () => {
    expect(parseArgs(['file.md'])).toBeUndefined();
  });
});

describe('resolveConfig', () => {
  it('resolves a lone zai key to the default host', () => {
    expect(resolveConfig(env(zaiKey), args([]))).toEqual({
      token: 'zai-key',
      url: ZAI_ORIGIN,
    });
  });

  it('routes to bigmodel off ZAI_BASE_URL', () => {
    expect(
      resolveConfig(
        env({ ...zaiKey, ZAI_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4' }),
        args([]),
      ),
    ).toEqual({ token: 'zai-key', url: BIGMODEL_ORIGIN });
  });

  it('lets the flag beat the env for the URL', () => {
    expect(
      resolveConfig(
        env({ ...zaiKey, ZAI_BASE_URL: 'https://open.bigmodel.cn' }),
        args(['--base-url', 'https://api.z.ai']),
      ),
    ).toEqual({ token: 'zai-key', url: ZAI_ORIGIN });
  });

  it('inherits the Claude Code pair on a z.ai host', () => {
    expect(resolveConfig(env(glmPair), args([]))).toEqual({
      token: 'cc-key',
      url: ZAI_ORIGIN,
    });
  });

  it('inherits the Claude Code pair on a bigmodel host', () => {
    expect(
      resolveConfig(
        env({
          ...glmPair,
          ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
        }),
        args([]),
      ),
    ).toEqual({ token: 'cc-key', url: BIGMODEL_ORIGIN });
  });

  it('inherits on dev.bigmodel.cn too', () => {
    expect(
      resolveConfig(
        env({
          ...glmPair,
          ANTHROPIC_BASE_URL: 'https://dev.bigmodel.cn/api/anthropic',
        }),
        args([]),
      ).url,
    ).toBe('https://dev.bigmodel.cn');
  });

  it('rejects the Claude Code token when routed elsewhere', () => {
    expect(() =>
      resolveConfig(
        env({
          ...glmPair,
          ANTHROPIC_BASE_URL: 'https://api.anthropic.com',
        }),
        args([]),
      ),
    ).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('rejects the Claude Code token when no base URL is set', () => {
    expect(() =>
      resolveConfig(env({ ANTHROPIC_AUTH_TOKEN: 'cc-key' }), args([])),
    ).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('treats an empty base URL as unset', () => {
    expect(() =>
      resolveConfig(
        env({ ...glmPair, ANTHROPIC_BASE_URL: '' }),
        args([]),
      ),
    ).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('lets an explicit GLM base URL unlock the inherited token', () => {
    expect(
      resolveConfig(
        env({ ANTHROPIC_AUTH_TOKEN: 'cc-key' }),
        args(['--base-url', 'https://open.bigmodel.cn']),
      ),
    ).toEqual({ token: 'cc-key', url: BIGMODEL_ORIGIN });
  });

  it('crosses families: zai URL + Claude Code token', () => {
    expect(
      resolveConfig(
        env({ ...glmPair, ZAI_BASE_URL: 'https://open.bigmodel.cn' }),
        args([]),
      ),
    ).toEqual({ token: 'cc-key', url: BIGMODEL_ORIGIN });
  });

  it('refuses the Claude Code token on a non-GLM zai URL', () => {
    expect(() =>
      resolveConfig(
        env({ ...glmPair, ZAI_BASE_URL: 'https://proxy.example' }),
        args([]),
      ),
    ).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('prefers the zai key over the inherited one', () => {
    expect(
      resolveConfig(env({ ...glmPair, ZAI_AUTH_TOKEN: 'zai-key' }), args([]))
        .token,
    ).toBe('zai-key');
  });

  it('lets the flag beat every env key', () => {
    expect(
      resolveConfig(
        env({ ...glmPair, ZAI_AUTH_TOKEN: 'zai-key' }),
        args(['--auth-token', 'flag-key']),
      ).token,
    ).toBe('flag-key');
  });

  it('errors with the variable name when nothing resolves', () => {
    expect(() => resolveConfig(env({}), args([]))).toThrow(
      /ZAI_AUTH_TOKEN/,
    );
  });

  it('rejects an unparseable base URL', () => {
    expect(() =>
      resolveConfig(env(zaiKey), args(['--base-url', 'localhost:6659'])),
    ).toThrow(/invalid base URL/);
  });
});

describe('USAGE', () => {
  it('names every flag', () => {
    expect(USAGE).toContain('--auth-token');
    expect(USAGE).toContain('--base-url');
    expect(USAGE).toContain('--hook');
  });
});
