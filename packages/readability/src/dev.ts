// Dev-only hot reload: tool implementations reload on file change without
// restarting the process; the harness in core owns the vite/runner/watch loop.
// Never bundled into dist (build entry is src/index.ts). Diagnostics to stderr.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { describeError } from '@v1nvn/agentic-core';
import { runDevServer } from '@v1nvn/agentic-core/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PresetCacheReport } from './preset-cache.js';

import { logger } from './logger.js';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

interface Handle {
  remove(): void;
}

// Loaded through Vite (not imported statically) so the runner controls its
// cache and can re-evaluate it on change.
interface RuntimeModule {
  createMcpServer(): McpServer;
  loadPresets(env?: NodeJS.ProcessEnv): PresetCacheReport | undefined;
  registerCapabilityGatedTools(server: McpServer): Handle[];
  registerResources(server: McpServer): Handle[];
  registerTools(server: McpServer): Handle[];
}

const here = dirname(fileURLToPath(import.meta.url));

runDevServer<RuntimeModule>({
  entry: resolve(here, 'server.ts'),
  log: logger,
  start: async mod => {
    const server = mod.createMcpServer();
    mod.loadPresets();
    let handles = [
      ...mod.registerTools(server),
      ...mod.registerResources(server),
    ];
    // Capability-gated tools (sampling) defer to the `initialized`
    // notification: `connect()` returns before the client advertises
    // capabilities, so a direct call here would observe
    // `getClientCapabilities() === undefined`. The hook fires once per
    // connection, after the initialize handshake but before any `tools/list`.
    let gatedHandles: Handle[] = [];
    server.server.oninitialized = () => {
      gatedHandles = mod.registerCapabilityGatedTools(server);
    };
    const transport = new StdioServerTransport();
    await server.connect(transport);
    return {
      closers: [server],
      reload: next => {
        for (const handle of [...handles, ...gatedHandles]) {
          handle.remove();
        }
        handles = [
          ...next.registerTools(server),
          ...next.registerResources(server),
        ];
        // The re-imported module graph starts with an empty preset store;
        // refill it alongside the re-registrations. The client is already
        // past `initialized` by the time a file change fires, so the gate
        // can re-evaluate directly.
        next.loadPresets();
        gatedHandles = next.registerCapabilityGatedTools(server);
      },
    };
  },
}).catch((error: unknown) => {
  logger.error(`dev failed: ${describeError(error)}`);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});
