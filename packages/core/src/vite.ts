/**
 * The one two-mode build every mod home runs — a home's `vite.config.ts` is a
 * thin wrapper handing `modVite` its standalone mode name and extra entries.
 */
import { configDefaults } from 'vitest/config';

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
