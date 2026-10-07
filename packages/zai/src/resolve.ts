import { parseQuietly } from '@v1nvn/agentic-core';
import { Command, Option } from 'commander';

const DEFAULT_BASE_URL = 'https://api.z.ai';

const GLM_HOSTS = new Set(['api.z.ai', 'dev.bigmodel.cn', 'open.bigmodel.cn']);

export interface ParsedArgs {
  readonly authToken: string | undefined;
  readonly baseUrl: string | undefined;
  readonly command?: 'usage';
  readonly json: boolean;
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

export function buildProgram(
  onUsage?: (options: Record<string, unknown>) => void,
): Command {
  const usage = new Command('usage')
    .description('GLM Coding Plan quota and usage report')
    .addOption(
      new Option('--auth-token <token>', 'API key').env('ZAI_AUTH_TOKEN'),
    )
    .addOption(new Option('--base-url <url>', 'base URL').env('ZAI_BASE_URL'))
    .addOption(
      new Option('--json', 'print the report lines as JSON for the zai mod'),
    )
    .action((options: Record<string, unknown>) => onUsage?.(options));
  return new Command()
    .name('zai-usage')
    .description('GLM Coding Plan usage — one command, usage')
    .action(() => undefined)
    .addCommand(usage);
}

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let parsed: ParsedArgs | undefined;
  const program = buildProgram(options => {
    const { authToken, baseUrl, json } = options as {
      authToken?: string;
      baseUrl?: string;
      json?: boolean;
    };
    parsed = {
      authToken: authToken || undefined,
      baseUrl: baseUrl || undefined,
      command: 'usage',
      json: json === true,
    };
  });
  if (parseQuietly(program, args) === undefined) {
    return undefined;
  }
  return (
    parsed ?? {
      authToken: undefined,
      baseUrl: undefined,
      command: undefined,
      json: false,
    }
  );
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
