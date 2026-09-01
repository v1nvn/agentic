import type { OmlxConfig } from './config.js';

import { OmlxError } from './errors.js';

interface ErrorBody {
  detail?: unknown;
  error?: { message?: unknown };
}

async function parseDetail(response: Response): Promise<string> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // Non-JSON error body; fall through to status text.
  }
  // /v1 endpoints answer with the OpenAI error shape; the admin API with detail.
  if (typeof body.error?.message === 'string') {
    return body.error.message;
  }
  if (typeof body.detail === 'string') {
    return body.detail;
  }
  if (body.detail !== undefined) {
    // FastAPI validation errors are a list of {loc, msg, type}.
    return JSON.stringify(body.detail);
  }
  return response.statusText;
}

function networkCause(err: unknown): string | undefined {
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause instanceof Error && 'code' in cause) {
    return String(cause.code);
  }
  return undefined;
}

async function request<T>(
  config: OmlxConfig,
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  try {
    response = await fetch(`${config.url}${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeoutMs),
      headers,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new OmlxError(
        `omlx did not respond within ${config.timeoutMs}ms at ${config.url}${path} — the model may still be loading; retry, or raise OMLX_TIMEOUT_MS`,
        { cause: err },
      );
    }
    if (err instanceof TypeError) {
      const code = networkCause(err);
      const at = code ? ` (${code})` : '';
      throw new OmlxError(
        `omlx unreachable at ${config.url}${at} — start it with: omlx serve`,
        { cause: err },
      );
    }
    throw err;
  }
  if (!response.ok) {
    if (response.status === 401) {
      throw new OmlxError(
        `omlx requires an API key for ${path} (401: ${await parseDetail(response)}) — set OMLX_API_KEY, or auth.api_key in ~/.omlx/settings.json`,
      );
    }
    throw new OmlxError(
      `omlx returned ${response.status} for ${path}: ${await parseDetail(response)}`,
    );
  }
  return (await response.json()) as T;
}

export function omlxGet<T>(config: OmlxConfig, path: string): Promise<T> {
  return request<T>(config, path, 'GET');
}

export function omlxPost<T>(
  config: OmlxConfig,
  path: string,
  body: unknown,
): Promise<T> {
  return request<T>(config, path, 'POST', body);
}
