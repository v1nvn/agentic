import { dirname, resolve } from 'node:path';
import {
  createServerModuleRunner,
  createServer as createViteServer,
} from 'vite';
import { configDefaults } from 'vitest/config';

import type { Logger } from './logger.ts';

import { watchWithReload } from './dev.ts';
import { describeError } from './mcp.ts';
import { shutdownOnSignals } from './shutdown.ts';

export interface ServerViteOptions {
  testTimeout?: number;
}

export function serverVite({ testTimeout }: ServerViteOptions = {}) {
  return {
    // Vite 8 spins the HMR websocket from `server.ws`, not `server.hmr`
    // (`hmr: false` stops messaging, not the socket): without this a second
    // dev boot dies fighting over the default ws port 24678.
    server: { ws: false },
    test: {
      globals: true,
      environment: 'node',
      ...(testTimeout === undefined ? {} : { testTimeout }),
      exclude: [...configDefaults.exclude, 'dist/**'],
    },
  };
}

export interface DevSession<T> {
  closers: readonly { close(): Promise<unknown> }[];
  reload(module: T): void;
}

/**
 * The hot-reload harness every MCP-server dev entry runs. The transport and
 * McpServer are single-use under the SDK (`StdioServerTransport.start()`
 * throws on a second call), so `start` creates and connects them once and
 * only the registrations swap on each file change. `start` must register
 * before connecting — the SDK's `registerCapabilities` throws post-connect.
 * `entry` is the module that exports the registration families, at
 * `<package root>/src/<name>.ts`.
 */
export async function runDevServer<T>(options: {
  entry: string;
  log: Logger;
  start: (module: T) => DevSession<T> | Promise<DevSession<T>>;
}): Promise<void> {
  const vite = await createViteServer({
    appType: 'custom',
    configFile: false,
    // Vite logs `info` (e.g. "(ssr) page reload") via console.log to stdout,
    // which corrupts the MCP stream; `warn` keeps errors on stderr.
    logLevel: 'warn',
    root: resolve(dirname(options.entry), '..'),
    server: { middlewareMode: true, ws: false },
  });

  // hmr: false in a hot-reload harness looks wrong but is right: the
  // watcher re-imports the whole entry rather than patching modules.
  const runner = createServerModuleRunner(vite.environments.ssr, {
    hmr: false,
  });

  const first = await runner.import<T>(options.entry);
  const session = await options.start(first);

  async function runOneReload(): Promise<void> {
    try {
      runner.evaluatedModules.clear();
      // Import the next module before reload removes the live
      // registrations: a failed import leaves what is serving intact.
      const next = await runner.import<T>(options.entry);
      session.reload(next);
      options.log.info('[reload] success');
    } catch (err) {
      options.log.error(`[reload] failed: ${describeError(err)}`);
    }
  }

  watchWithReload(vite, runOneReload);

  options.log.info('[reload] ready');

  shutdownOnSignals([...session.closers, vite]);
}
