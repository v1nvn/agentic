import { parseQuietly } from '@v1nvn/agentic-core';
import { Command, Option } from 'commander';

const DEFAULT_BASE_URL = 'https://api.z.ai';

const GLM_HOSTS = new Set(['api.z.ai', 'dev.bigmodel.cn', 'open.bigmodel.cn']);

export interface ParsedArgs {
  readonly authToken: string | undefined;
  readonly baseUrl: string | undefined;
  readonly hook: boolean;
}

export interface ResolvedConfig {
  readonly token: string;
  readonly url: string;
}

interface BaseUrl {
  readonly glm: boolean;
  readonly origin: string;
}

function fromEnv(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

function originOf(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

function isGlm(origin: string): boolean {
  return GLM_HOSTS.has(new URL(origin).hostname);
}

function resolveBaseUrl(
  flag: string | undefined,
  env: NodeJS.ProcessEnv,
): BaseUrl {
  if (flag !== undefined) {
    const origin = originOf(flag);
    if (origin === undefined) {
      throw new Error(`invalid base URL: ${flag}`);
    }
    return { glm: isGlm(origin), origin };
  }
  const inherited = fromEnv(env.ANTHROPIC_BASE_URL);
  const origin = inherited === undefined ? undefined : originOf(inherited);
  if (origin !== undefined && isGlm(origin)) {
    return { glm: true, origin };
  }
  return { glm: false, origin: DEFAULT_BASE_URL };
}

export function buildProgram(): Command {
  return new Command()
    .name('zai-usage')
    .addOption(
      new Option('--auth-token <token>', 'API key').env('ZAI_AUTH_TOKEN'),
    )
    .addOption(new Option('--base-url <url>', 'base URL').env('ZAI_BASE_URL'))
    .option('--hook', 'emit a UserPromptExpansion block instead of printing');
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  const program = parseQuietly(buildProgram(), args);
  if (program === undefined) {
    return undefined;
  }
  const { authToken, baseUrl, hook } = program.opts<{
    authToken: string | undefined;
    baseUrl: string | undefined;
    hook: boolean | undefined;
  }>();
  return {
    authToken: authToken || undefined,
    baseUrl: baseUrl || undefined,
    hook: hook ?? false,
  };
}

export function resolveConfig(
  env: NodeJS.ProcessEnv,
  parsed: ParsedArgs,
): ResolvedConfig {
  const base = resolveBaseUrl(parsed.baseUrl, env);
  const token =
    parsed.authToken ??
    (base.glm ? fromEnv(env.ANTHROPIC_AUTH_TOKEN) : undefined);
  if (token === undefined) {
    throw new Error(
      env.ANTHROPIC_AUTH_TOKEN
        ? 'ANTHROPIC_AUTH_TOKEN is set, but the resolved base URL does not name a GLM host, so it is not a GLM Coding Plan token — set ZAI_AUTH_TOKEN (or --auth-token)'
        : 'no API key: set ZAI_AUTH_TOKEN (or --auth-token)',
    );
  }
  return { token, url: base.origin };
}
