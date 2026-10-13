import { configDefaults, defineConfig } from 'vitest/config';

// The package's vitest suite lives in test/. The renderer entries run as
// node source (src/render/entry.ts) — no build to bootstrap first.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    // The responsive fit sweep renders dozens of widths with live git reads;
    // 300s gives that run headroom.
    testTimeout: 300_000,
    exclude: [...configDefaults.exclude, 'dist/**'],
  },
});
