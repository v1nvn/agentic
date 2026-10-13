import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { loadConfig } from './config.ts';
import { registerAskStructuredTool } from './tools/ask_structured.ts';
import { registerAskTool } from './tools/ask.ts';
import { registerModelsTool } from './tools/models.ts';

export interface ToolHandle {
  remove(): void;
}

export function createMcpServer(): McpServer {
  const { name, version, title, description, instructions } = loadConfig();
  return new McpServer({ name, version, title, description }, { instructions });
}

export function registerTools(server: McpServer): ToolHandle[] {
  return [
    registerAskStructuredTool(server),
    registerAskTool(server),
    registerModelsTool(server),
  ];
}

export function createServer(): McpServer {
  const server = createMcpServer();
  registerTools(server);
  return server;
}
