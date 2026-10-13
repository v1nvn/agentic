import { configDefaults, defineConfig } from 'vitest/config';

// Vitest config for the core suite. `src/vite.ts` publishes the dev-server
// factory as `@v1nvn/agentic-core/vite` — dev-only, loaded by a server
// home's vite.config.ts, never by the shipped CLIs.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
