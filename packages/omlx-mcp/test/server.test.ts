import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it } from 'vitest';

import { createServer } from '../src/server.js';

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface Connected {
  client: Client;
  close(): Promise<void>;
}

async function connect(): Promise<Connected> {
  const server = createServer();
  const [serverT, clientT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(clientT);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

let conn: Connected;

afterEach(async () => {
  await conn?.close();
});

async function listTools(): Promise<Tool[]> {
  conn = await connect();
  const result = await conn.client.request(
    { method: 'tools/list' },
    ListToolsResultSchema,
  );
  return result.tools;
}

function byName(tools: Tool[], name: string): Tool {
  const tool = tools.find(entry => entry.name === name);
  if (!tool) {
    throw new Error(`tool not listed: ${name}`);
  }
  return tool;
}

describe('tools/list', () => {
  it('exposes the three delegation tools', async () => {
    expect((await listTools()).map(tool => tool.name)).toEqual([
      'ask_structured',
      'ask',
      'models',
    ]);
  });

  it('documents every input field on the wire', async () => {
    const tools = await listTools();
    expect(Object.keys(byName(tools, 'ask').inputSchema.properties ?? {}).sort()).toEqual([
      'images',
      'max_tokens',
      'model',
      'prompt',
      'reasoning_effort',
      'system',
      'temperature',
    ]);
    expect(
      Object.keys(byName(tools, 'ask_structured').inputSchema.properties ?? {}).sort(),
    ).toEqual(['images', 'max_tokens', 'model', 'prompt', 'reasoning_effort', 'schema', 'schema_name', 'system', 'temperature']);
    for (const tool of tools) {
      const properties = tool.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      for (const [name, schema] of Object.entries(properties)) {
        expect(schema.description, `${tool.name}.${name}`).toBeTruthy();
      }
      expect(tool.description?.length, tool.name).toBeGreaterThan(80);
      expect(tool.title, tool.name).toBeTruthy();
    }
  });

  it('lands defaults in the wire schema', async () => {
    const byName = Object.fromEntries(
      (await listTools()).map(tool => [tool.name, tool]),
    );
    const ask = byName['ask']?.inputSchema.properties;
    expect(ask?.max_tokens).toMatchObject({ default: 2048 });
    expect(ask?.reasoning_effort).toMatchObject({ default: 'low' });
    const required = byName['ask']?.inputSchema.required;
    expect(required).toEqual(['prompt']);
  });

  it('carries the server identity', async () => {
    conn = await connect();
    const info = conn.client.getServerVersion();
    expect(info).toMatchObject({ name: 'omlx-mcp', title: 'omlx MCP' });
    expect(conn.client.getInstructions()).toContain('ask_structured');
  });
});
