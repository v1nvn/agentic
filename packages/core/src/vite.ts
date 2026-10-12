import { dirname, resolve } from 'node:path';
import {
  createServerModuleRunner,
  createServer as createViteServer,
} from 'vite';
import { configDefaults } from 'vitest/config';

import type { Logger } from './logger.js';

import { watchWithReload } from './dev.js';
import { describeError } from './mcp.js';
import { shutdownOnSignals } from './shutdown.js';

export interface ModViteOptions {
  /** Extra CLI-pass entries beside the CLI itself, e.g. tokens' `text` library chunk. */
  entries?: Record<string, string>;
  /** The `--mode` that builds the standalone artifact, and the `bin/<name>.mjs` it emits. */
  standalone: { mode: string; name: string };
}

export function modVite(
  mode: string,
  { standalone, entries = {} }: ModViteOptions,
) {
  // The standalone pass emits the artifact the plugin folder carries — the
  // mod execs it through the session's Bash tool, where no node_modules
  // exists, so it inlines every dependency. Only ever run under `node`, where
  // the banner is inert.
  if (mode === standalone.mode) {
    return {
      ssr: { noExternal: true },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        ssr: true,
        rollupOptions: {
          input: { [standalone.name]: 'src/index.ts' },
          output: {
            banner: '#!/usr/bin/env node',
            entryFileNames: `${standalone.name}.mjs`,
          },
        },
      },
    };
  }
  // The CLI pass builds the default way: external deps, installed beside it
  // by npx. SSR/Node build: Vite externalizes node built-ins AND package.json
  // `dependencies` (`@v1nvn/agentic-core` stays a real dep), so only source
  // is bundled; ESM out matches "type":"module".
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      ssr: true,
      rollupOptions: {
        input: { index: 'src/index.ts', ...entries },
        // `bin` (dist/index.js) is exec'd by the kernel; without a shebang
        // the OS runs it under /bin/sh and `npx <bin>` dies parsing `import`.
        // Library chunks carry none.
        output: {
          banner: (chunk: { facadeModuleId?: string; isEntry: boolean }) =>
            chunk.isEntry && chunk.facadeModuleId?.endsWith('src/index.ts')
              ? '#!/usr/bin/env node'
              : '',
        },
      },
    },
    test: {
      globals: true,
      environment: 'node',
      exclude: [...configDefaults.exclude, 'dist/**', 'tests/**'],
    },
  };
}

export interface ServerViteOptions {
  testTimeout?: number;
}

export function serverVite({ testTimeout }: ServerViteOptions = {}) {
  return {
    // Vite 8 spins the HMR websocket from `server.ws`, not `server.hmr`
    // (`hmr: false` stops messaging, not the socket): without this a second
    // dev boot dies fighting over the default ws port 24678.
    server: { ws: false },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      // SSR/Node build: Vite externalizes node built-ins AND package.json
      // `dependencies`, so only source is bundled; ESM out matches
      // "type":"module".
      ssr: 'src/index.ts',
      rollupOptions: {
        // `bin` (dist/index.js) is exec'd by npx; without a shebang the OS
        // runs it under /bin/sh and dies parsing `import`.
        output: {
          banner: (chunk: { isEntry: boolean }) =>
            chunk.isEntry ? '#!/usr/bin/env node' : '',
        },
      },
    },
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
