import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildProgram, parseArgs, resolveConfig } from '../src/resolve.js';
import type { ParsedArgs } from '../src/resolve.js';

const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;

// The resolve tests only use argv that parses; the parse tests cover the rest.
const args = (argv: string[]): ParsedArgs => parseArgs(['usage', ...argv]) as ParsedArgs;

// An empty stub reads as unset, pinning a clean env where the machine exports ZAI_*.
beforeEach(() => {
  vi.stubEnv('ZAI_AUTH_TOKEN', '');
  vi.stubEnv('ZAI_BASE_URL', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const ZAI_ORIGIN = 'https://api.z.ai';
const BIGMODEL_ORIGIN = 'https://open.bigmodel.cn';

const glmPair = {
  ANTHROPIC_AUTH_TOKEN: 'cc-key',
  ANTHROPIC_BASE_URL: 'https://api.z.ai/api/anthropic',
};

describe('parseArgs', () => {
  it('parses flags in any order', () => {
    expect(
      parseArgs(['usage', '--base-url', 'https://x', '--auth-token', 't']),
    ).toEqual({
      authToken: 't',
      baseUrl: 'https://x',
      command: 'usage',
      json: false,
    });
  });

  it('parses the --flag=value form', () => {
    expect(
      parseArgs(['usage', '--auth-token=t', '--base-url=https://x']),
    ).toEqual({
      authToken: 't',
      baseUrl: 'https://x',
      command: 'usage',
      json: false,
    });
  });

  it('parses --json', () => {
    expect(parseArgs(['usage', '--json'])!.json).toBe(true);
  });

  it('answers bare with no command', () => {
    expect(parseArgs([])).toEqual({
      authToken: undefined,
      baseUrl: undefined,
      command: undefined,
      json: false,
    });
  });

  it('refuses the flags outside the command', () => {
    expect(parseArgs(['--auth-token', 't'])).toBeUndefined();
  });

  it('folds ZAI_AUTH_TOKEN in from the environment', () => {
    vi.stubEnv('ZAI_AUTH_TOKEN', 'env-key');
    expect(parseArgs(['usage'])!.authToken).toBe('env-key');
  });

  it('lets the flag beat the environment', () => {
    vi.stubEnv('ZAI_AUTH_TOKEN', 'env-key');
    vi.stubEnv('ZAI_BASE_URL', 'https://open.bigmodel.cn');
    const parsed = parseArgs(['usage', '--auth-token', 'flag-key'])!;
    expect(parsed.authToken).toBe('flag-key');
    expect(parsed.baseUrl).toBe('https://open.bigmodel.cn');
  });

  it('rejects a flag with no value', () => {
    expect(parseArgs(['usage', '--auth-token'])).toBeUndefined();
  });

  it('rejects unknown flags', () => {
    expect(parseArgs(['usage', '--platform', 'zhipu'])).toBeUndefined();
  });

  it('rejects positionals', () => {
    expect(parseArgs(['usage', 'file.md'])).toBeUndefined();
    expect(parseArgs(['usage2'])).toBeUndefined();
  });
});

describe('resolveConfig', () => {
  it('resolves a lone zai key to the default host', () => {
    expect(resolveConfig(env({}), args(['--auth-token', 'zai-key']))).toEqual({
      token: 'zai-key',
      url: ZAI_ORIGIN,
    });
  });

  it('routes to bigmodel off a ZAI base URL', () => {
    expect(
      resolveConfig(
        env({}),
        args(['--base-url', 'https://open.bigmodel.cn/api/paas/v4', '--auth-token', 'zai-key']),
      ),
    ).toEqual({ token: 'zai-key', url: BIGMODEL_ORIGIN });
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

  it('crosses the seams: ZAI_BASE_URL from env with the inherited token', () => {
    vi.stubEnv('ZAI_BASE_URL', 'https://open.bigmodel.cn');
    expect(
      resolveConfig(env({ ANTHROPIC_AUTH_TOKEN: 'cc-key' }), args([])),
    ).toEqual({ token: 'cc-key', url: BIGMODEL_ORIGIN });
  });

  it('refuses the Claude Code token on a non-GLM zai URL', () => {
    expect(() =>
      resolveConfig(
        env({ ...glmPair, ZAI_BASE_URL: 'https://proxy.example' }),
        args(['--base-url', 'https://proxy.example']),
      ),
    ).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('prefers the zai key over the inherited one', () => {
    expect(
      resolveConfig(env(glmPair), args(['--auth-token', 'zai-key'])).token,
    ).toBe('zai-key');
  });

  it('lets the flag beat every env key', () => {
    expect(
      resolveConfig(env(glmPair), args(['--auth-token', 'flag-key'])).token,
    ).toBe('flag-key');
  });

  it('errors with the variable name when nothing resolves', () => {
    expect(() => resolveConfig(env({}), args([]))).toThrow(/ZAI_AUTH_TOKEN/);
  });

  it('rejects an unparseable base URL', () => {
    expect(() =>
      resolveConfig(env({}), args(['--base-url', 'localhost:6659'])),
    ).toThrow(/invalid base URL/);
  });

  it('rejects a flag-like base-url value at resolve', () => {
    expect(() =>
      resolveConfig(env({}), args(['--base-url', '--auth-token'])),
    ).toThrow(/invalid base URL/);
  });
});

describe('buildProgram help', () => {
  it('bare lists the usage command; its flags live on the command', () => {
    const program = buildProgram();
    expect(program.helpInformation()).toContain('usage');
    const help = program.commands.find(c => c.name() === 'usage')!
      .helpInformation();
    expect(help).toContain('--auth-token');
    expect(help).toContain('--base-url');
    expect(help).toContain('ZAI_AUTH_TOKEN');
    expect(help).toContain('ZAI_BASE_URL');
  });
});
