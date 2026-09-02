/**
 * NEXORA — client ESLint configuration (flat config, ESLint v9+).
 *
 * Goals:
 *   - catch real bugs and obvious mistakes
 *   - enforce a baseline of consistency
 *   - keep React hooks and refresh boundaries safe
 *   - stay out of the way for normal development
 *
 * Stylistic preferences are intentionally delegated to Prettier.
 */

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Apply to every file under client/src and client/*.config.js
  {
    ignores: ['dist/**', 'node_modules/**', '.vite/**'],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Vite HMR relies on the file containing a React component
      // export. Warn when only-fast-refresh breaks that contract.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-console': 'off',

      // The recommended React preset enables `react/react-in-jsx-scope`
      // which is unnecessary with the new JSX transform.
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },
];
