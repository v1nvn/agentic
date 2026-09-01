// Live smoke against a real omlx server — gated behind RUN_LIVE=1 (`yarn
// test:live`) so CI and ordinary runs never touch the machine's server.
// Green unit tests are not proof; the connected server is.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { describe, expect, it } from 'vitest';

import { createServer } from '../src/server.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const RUN_LIVE = process.env.RUN_LIVE === '1';

async function call(name: string, args: Record<string, unknown> = {}) {
  const server = createServer();
  const [serverT, clientT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: 'live-client', version: '0.0.0' });
  await client.connect(clientT);
  try {
    return (await client.callTool({ arguments: args, name }, CallToolResultSchema, {
      timeout: 300_000,
    })) as CallToolResult;
  } finally {
    await client.close();
    await server.close();
  }
}

describe.skipIf(!RUN_LIVE)('live omlx server', () => {
  it('documents every tool and field over the wire', async () => {
    const server = createServer();
    const [serverT, clientT] = InMemoryTransport.createLinkedPair();
    await server.connect(serverT);
    const client = new Client({ name: 'live-client', version: '0.0.0' });
    await client.connect(clientT);
    try {
      const result = await client.request(
        { method: 'tools/list' },
        ListToolsResultSchema,
      );
      expect(result.tools.map(t => t.name)).toEqual([
        'ask_structured',
        'ask',
        'models',
      ]);
      for (const tool of result.tools) {
        const properties = tool.inputSchema.properties as Record<
          string,
          { description?: string }
        >;
        for (const [field, schema] of Object.entries(properties)) {
          expect(schema.description, `${tool.name}.${field}`).toBeTruthy();
        }
      }
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('models reports the installed model', async () => {
    const result = await call('models');
    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.structuredContent)).toContain('Qwen3.8-27B');
  });

  it('ask answers a one-shot prompt', { timeout: 600_000 }, async () => {
    const result = await call('ask', {
      prompt: 'Reply with exactly: ok',
    });
    expect(result.isError).toBeFalsy();
    const first = result.content[0];
    expect(first?.type === 'text' ? first.text.length : 0).toBeGreaterThan(0);
  });

  it('ask_structured returns parsed JSON matching the schema', { timeout: 600_000 }, async () => {
    const result = await call('ask_structured', {
      prompt: 'Name any two programming languages.',
      schema: {
        properties: {
          languages: { items: { type: 'string' }, type: 'array' },
        },
        required: ['languages'],
        type: 'object',
      },
    });
    expect(result.isError).toBeFalsy();
    const parsed = result.structuredContent?.result as {
      languages?: string[];
    };
    expect(Array.isArray(parsed.languages)).toBe(true);
    expect(parsed.languages?.length ?? 0).toBeGreaterThanOrEqual(1);
  });
});
