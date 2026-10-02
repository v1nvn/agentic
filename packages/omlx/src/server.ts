import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { loadConfig } from './config.js';
import { registerAskStructuredTool } from './tools/ask_structured.js';
import { registerAskTool } from './tools/ask.js';
import { registerModelsTool } from './tools/models.js';

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
