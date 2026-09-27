import { configDefaults, defineConfig } from 'vitest/config';

// One config, two build modes, both run by `yarn build`. The renderer is ONE
// self-contained file — configure syncs render.mjs alone into the data dir
// where the settings keys spawn it — so it shares no chunk with the CLI and
// is built in its own pass (`--mode render`). The CLI builds the default way
// and inlines the engine it now renders through in-process.
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
    // render entry only ever runs as `node render.mjs`, where the banner is
    // inert — one banner rule covers both.
    banner: (chunk: { isEntry: boolean }) =>
      chunk.isEntry ? '#!/usr/bin/env node' : '',
  };
  if (mode === 'render') {
    return {
      build: {
        outDir: common.outDir,
        sourcemap: common.sourcemap,
        minify: common.minify,
        ssr: common.ssr,
        emptyOutDir: false,
        rollupOptions: {
          input: { render: 'src/render/entry.ts' },
          output: { banner: common.banner, entryFileNames: 'render.mjs' },
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
