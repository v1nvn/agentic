export const USAGE =
  'Usage: zai-usage [--auth-token TOKEN] [--base-url URL] [--hook]';

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
  const native = flag ?? fromEnv(env.ZAI_BASE_URL);
  if (native !== undefined) {
    const origin = originOf(native);
    if (origin === undefined) {
      throw new Error(`invalid base URL: ${native}`);
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

export function parseArgs(args: readonly string[]): ParsedArgs | undefined {
  let authToken: string | undefined;
  let baseUrl: string | undefined;
  let hook = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--hook') {
      hook = true;
    } else if (arg === '--auth-token' || arg === '--base-url') {
      const value = args.at(++i);
      if (value === undefined || value.startsWith('--')) {
        return undefined;
      }
      if (arg === '--auth-token') {
        authToken = value;
      } else {
        baseUrl = value;
      }
    } else {
      return undefined;
    }
  }
  return { authToken, baseUrl, hook };
}

export function resolveConfig(
  env: NodeJS.ProcessEnv,
  parsed: ParsedArgs,
): ResolvedConfig {
  const base = resolveBaseUrl(parsed.baseUrl, env);
  const token =
    parsed.authToken ??
    fromEnv(env.ZAI_AUTH_TOKEN) ??
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
