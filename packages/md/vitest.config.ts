import { configDefaults, defineConfig } from 'vitest/config';

// The package's vitest suite lives in test/*.spec.ts; tests/*.test.ts belongs
// to the engine's own runner (claude plugin test).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/**'],
  },
});
