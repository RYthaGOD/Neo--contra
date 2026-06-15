import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Phaser and @solana/web3.js interop frequently needs `any` at the library
      // boundary; real type safety is still enforced by `tsc --strict`.
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow intentionally-unused names prefixed with underscore.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Context files legitimately export a provider + a hook; this is a
      // fast-refresh DX hint, not a correctness issue.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
