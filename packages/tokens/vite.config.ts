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
    // source is bundled. ESM out matches "type":"module". The second entry
    // publishes the island's text module as `@v1nvn/tokens/text`.
    ssr: true,
    rollupOptions: {
      input: { index: 'src/index.ts', text: 'src/text.ts' },
      // `bin` (dist/index.js) is exec'd by the kernel; without a shebang the OS
      // runs it under /bin/sh and `npx tokens-report` dies parsing `import`.
      // The text entry is a library chunk and carries none.
      output: {
        banner: chunk =>
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
});
