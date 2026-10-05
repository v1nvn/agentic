import { configDefaults, defineConfig } from 'vitest/config';

// One config, two build modes, both run by `yarn build`. The usage pass emits
// the standalone artifact the plugin folder carries — the mod execs it
// through the session's Bash tool, where no node_modules exists, so it
// inlines every dependency. The CLI builds the default way: external deps,
// installed beside it by npx.
export default defineConfig(({ mode }) => {
  if (mode === 'usage') {
    return {
      ssr: { noExternal: true },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        ssr: true,
        rollupOptions: {
          input: { usage: 'src/index.ts' },
          // Only ever run under `node`, where the banner is inert.
          output: {
            banner: '#!/usr/bin/env node',
            entryFileNames: 'usage.mjs',
          },
        },
      },
    };
  }
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true,
      minify: false,
      // SSR/Node build: Vite externalizes node built-ins AND package.json
      // `dependencies` (@v1nvn/agentic-core stays a real dep), so only our
      // source is bundled. ESM out matches "type":"module".
      ssr: 'src/index.ts',
      rollupOptions: {
        // `bin` (dist/index.js) is exec'd by the kernel; without a shebang the OS
        // runs it under /bin/sh and `npx zai-usage` dies parsing `import`.
        output: {
          banner: chunk => (chunk.isEntry ? '#!/usr/bin/env node' : ''),
        },
      },
    },
    test: {
      globals: true,
      environment: 'node',
      exclude: [...configDefaults.exclude, 'dist/**', 'tests/**'],
    },
  };
});
