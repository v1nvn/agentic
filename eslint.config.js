import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import nodePlugin from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// The mod island: mod source files living inside a package's src/, beside the
// npm code. A glob cannot say "the island subset of src", so it is named here
// once — the type-aware block skips it, the mod block below lints it.
const modIsland = 'packages/tokens/src/{aggregate,format,text}.ts';

export default defineConfig([
  {
    ignores: [
      '**/node_modules',
      '**/dist/**',
      '**/build',
      '**/coverage',
      '**/.act/**',
      '**/tmp/**',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '.yarn/**',
      // Engine-written, regenerated on every plugin load — never hand-edited.
      '**/.claude-plugin/types/**',
      'packages/*/tsconfig.json',
    ],
  },
  {
    extends: [
      js.configs['recommended'],
      nodePlugin.configs['flat/recommended-module'],
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: false,
      }),
      promise.configs['flat/recommended'],
      prettierRecommended,
      perfectionist.configs['recommended-natural'],
      eslintConfigPrettier,
    ],
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: [modIsland],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      'promise/always-return': ['error', { ignoreLastCallback: true }],
      curly: 'error',
      'func-style': ['error', 'declaration'],
      'no-else-return': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            ['value-builtin', 'value-external'],
            'type-internal',
            'value-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'ts-equals-import',
            'unknown',
          ],
          environment: 'node',
        },
      ],
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-modules': 'off',
    },
  },
  {
    // Mod sources (a re-rooted package: hooks/, tests/, and the island inside
    // src/): the same style, without the type-aware rules — their type gate is
    // `tsc -p tsconfig.mods.json`, and type-aware linting would load the
    // 15k-line vendored claude-code.d.ts into the linter's program.
    extends: [
      js.configs['recommended'],
      nodePlugin.configs['flat/recommended-module'],
      ...tseslint.configs.recommended,
      stylistic.configs.customize({
        indent: 2,
        quotes: 'single',
        semi: true,
        jsx: false,
      }),
      promise.configs['flat/recommended'],
      prettierRecommended,
      perfectionist.configs['recommended-natural'],
      eslintConfigPrettier,
    ],
    files: ['packages/*/hooks/**/*.{ts,tsx}', 'packages/*/tests/**/*.{ts,tsx}', modIsland],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'no-unused-vars': 'off',
      curly: 'error',
      'func-style': ['error', 'declaration'],
      'no-else-return': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            ['value-builtin', 'value-external'],
            'type-internal',
            'value-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'ts-equals-import',
            'unknown',
          ],
          environment: 'node',
        },
      ],
      'perfectionist/sort-objects': 'off',
      'perfectionist/sort-modules': 'off',
    },
  },
]);
