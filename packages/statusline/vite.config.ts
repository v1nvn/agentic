import { configDefaults, defineConfig } from 'vitest/config';

// One config, three build modes, all run by `yarn build`. The render and
// resolver passes each emit one standalone entry the data dir and the plugin
// dir carry — run bare, so each inlines every dependency; a shared module
// would leave the entry with a sibling import no data dir can resolve.
// Neither shares a chunk with the CLI, which builds the default way and
// inlines the engine it renders through.
export default defineConfig(({ mode }) => {
  const common = {
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    // SSR/Node build: Vite externalizes node built-ins AND package.json
    // `dependencies` (@v1nvn/agentic-core stays a real dep), so only our
    // source is bundled. ESM out matches "type":"module".
    ssr: true,
    // `bin` (dist/index.js) is exec'd by the kernel; without a shebang the OS
    // runs it under /bin/sh and `npx statusline` dies parsing `import`. The
    // render entries only ever run under `node`, where the banner is inert.
    banner: (chunk: { isEntry: boolean }) =>
      chunk.isEntry ? '#!/usr/bin/env node' : '',
  };
  if (mode === 'render' || mode === 'resolver') {
    const entry =
      mode === 'render'
        ? (['render', 'src/render/entry.ts'] as const)
        : (['resolver', 'src/render/resolver.ts'] as const);
    return {
      ssr: { noExternal: true },
      build: {
        outDir: common.outDir,
        sourcemap: common.sourcemap,
        minify: common.minify,
        ssr: common.ssr,
        emptyOutDir: false,
        rollupOptions: {
          input: { [entry[0]]: entry[1] },
          output: {
            banner: common.banner,
            entryFileNames: '[name].mjs',
            codeSplitting: false,
          },
        },
      },
    };
  }
  return {
    build: {
      outDir: common.outDir,
      sourcemap: common.sourcemap,
      minify: common.minify,
      ssr: common.ssr,
      emptyOutDir: true,
      rollupOptions: {
        input: { index: 'src/index.ts' },
        output: { banner: common.banner, entryFileNames: '[name].js' },
      },
    },
    test: {
      globals: true,
      environment: 'node',
      globalSetup: ['./test/global-setup.ts'],
      // The responsive fit sweep renders dozens of widths with live git reads;
      // 300s gives that run headroom.
      testTimeout: 300_000,
      exclude: [...configDefaults.exclude, 'dist/**'],
    },
  };
});
