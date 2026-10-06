import { configDefaults, defineConfig } from 'vitest/config';

// Single config driving both `vite build` and `vitest`. The second entry
// publishes the mod-vite factory as `@v1nvn/agentic-core/vite` — dev-only,
// loaded by a home's vite.config.ts, never by the shipped CLIs.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    // SSR/Node build: Vite externalizes node built-ins, so only our source is
    // bundled. ESM out matches "type":"module".
    ssr: true,
    rollupOptions: {
      input: { index: 'src/index.ts', vite: 'src/vite.ts' },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
