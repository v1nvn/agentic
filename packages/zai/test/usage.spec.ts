import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchReport } from '../src/usage.js';

const config = { token: 'bad-key', url: 'https://api.z.ai' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// A Response body reads once; the report fires three parallel fetches.
function stubFetch(...bodies: unknown[]): void {
  let n = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => jsonResponse(bodies[n++ % bodies.length])),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchReport', () => {
  it('throws on an HTTP-200 failure envelope instead of rendering zeros', async () => {
    stubFetch({
      code: 1000,
      msg: 'Authentication Failed',
      success: false,
    });
    await expect(fetchReport(config)).rejects.toThrow(/Authentication Failed/);
  });

  it('unwraps the data field of a success envelope', async () => {
    stubFetch({ code: 200, msg: 'success', success: true, data: {} });
    const report = await fetchReport(config);
    expect(report).toContain('tokens across');
  });
});
