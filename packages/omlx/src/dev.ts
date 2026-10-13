// Dev-only hot reload: tool implementations reload on file change without
// restarting the process; the harness in core owns the vite/runner/watch loop.
// Never bundled into dist (build entry is src/index.ts). Diagnostics to stderr.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { describeError } from '@v1nvn/agentic-core';
import { runDevServer } from '@v1nvn/agentic-core/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { logger } from './logger.ts';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface Handle {
  remove(): void;
}

// Loaded through Vite (not imported statically) so the runner controls its
// cache and can re-evaluate it on change.
interface RuntimeModule {
  createMcpServer(): McpServer;
  registerTools(server: McpServer): Handle[];
}

const here = dirname(fileURLToPath(import.meta.url));

runDevServer<RuntimeModule>({
  entry: resolve(here, 'server.ts'),
  log: logger,
  start: async mod => {
    const server = mod.createMcpServer();
    let handles = mod.registerTools(server);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return {
      closers: [server],
      reload: next => {
        for (const handle of handles) {
          handle.remove();
        }
        handles = next.registerTools(server);
      },
    };
  },
}).catch((error: unknown) => {
  logger.error(`dev failed: ${describeError(error)}`);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});
