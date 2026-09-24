import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { shutdownOnSignals } from '@v1nvn/agentic-core';

import { createServer } from './server.js';

const server: McpServer = createServer();
const transport = new StdioServerTransport();

await server.connect(transport);

shutdownOnSignals([server]);
