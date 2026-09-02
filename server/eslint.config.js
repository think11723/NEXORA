/**
 * NEXORA — server ESLint configuration (flat config, ESLint v9+).
 *
 * Goals:
 *   - catch real bugs and obvious mistakes
 *   - keep Node.js code paths and globals in check
 *   - stay out of the way for normal development
 *
 * Stylistic preferences are intentionally delegated to Prettier.
 * `no-console` is left off because lifecycle logging is intentional.
 *
 * Authored as CommonJS because the server runtime stays CommonJS.
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,

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
    },
  },
];
