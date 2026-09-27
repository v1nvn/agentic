import { configDefaults, defineConfig } from 'vitest/config';

// Single config driving both `vite build` and `vitest`.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    // SSR/Node build: Vite externalizes node built-ins AND package.json
    // `dependencies` (@v1nvn/agentic-core stays a real dep), so only our
    // source is bundled. ESM out matches "type":"module".
    ssr: true,
    rollupOptions: {
      input: {
        index: 'src/index.ts',
        render: 'src/render/entry.ts',
      },
      // `bin` (dist/index.js) is exec'd by the kernel; without a shebang the OS
      // runs it under /bin/sh and `npx statusline` dies parsing `import`. The
      // render entry only ever runs as `node render.mjs`, where the banner is
      // inert — one banner rule covers both.
      output: {
        banner: chunk => (chunk.isEntry ? '#!/usr/bin/env node' : ''),
        entryFileNames: chunk =>
          chunk.name === 'render' ? 'render.mjs' : '[name].js',
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Unpinned wizard tests spawn the bash runtime per draw; 300s gives
    // those runs headroom.
    testTimeout: 300_000,
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
