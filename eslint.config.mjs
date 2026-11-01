// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import goalz from './tools/eslint-plugin-goalz.mjs';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/storybook-static/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // In tests, `rows[0]!` failing loudly is the desired outcome.
    files: ['**/*.test.ts', '**/*.test.tsx', 'supabase/tests/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // User-facing UI must take every string from i18n. Stories and tests are exempt.
    files: ['packages/ui/src/**/*.tsx', 'apps/**/*.tsx'],
    ignores: ['**/*.stories.tsx', '**/*.test.tsx'],
    plugins: { goalz },
    rules: {
      'goalz/no-literal-ui-string': 'error',
    },
  },
);
