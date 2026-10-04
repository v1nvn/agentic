import { configDefaults, defineConfig } from 'vitest/config';

// One config, two build modes, both run by `yarn build`. The report pass
// emits the standalone artifact the plugin folder carries — the mod execs it
// through the session's Bash tool, where no node_modules exists, so it
// inlines every dependency. The CLI builds the default way: external deps,
// installed beside it by npx.
export default defineConfig(({ mode }) => {
  if (mode === 'report') {
    return {
      ssr: { noExternal: true },
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        sourcemap: true,
        minify: false,
        ssr: true,
        rollupOptions: {
          input: { report: 'src/index.ts' },
          // Only ever run under `node`, where the banner is inert.
          output: {
            banner: '#!/usr/bin/env node',
            entryFileNames: 'report.mjs',
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
  };
});
