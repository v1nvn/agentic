import { vi } from 'vitest';

import type { Mock } from 'vitest';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export function textOf(result: CallToolResult): string {
  const first = result.content[0];
  return first?.type === 'text' ? first.text : '';
}

export interface FetchCall {
  body?: unknown;
  init?: RequestInit;
  url: string;
}

export interface FetchStub {
  calls: FetchCall[];
  fetch: Mock;
}

export function stubFetch(
  handler: (call: FetchCall) => Response | Promise<Response>,
): FetchStub {
  const calls: FetchCall[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const call: FetchCall = {
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
      init,
      url: String(url),
    };
    calls.push(call);
    return handler(call);
  });
  vi.stubGlobal('fetch', fetch);
  return { calls, fetch };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}
