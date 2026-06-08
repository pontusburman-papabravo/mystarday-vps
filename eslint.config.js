/**
 * ESLint flat config — mild rules to catch common bugs.
 * Runs on src/ and server.js only; excludes tests (they use globals like 'test').
 */

'use strict';

module.exports = [
  {
    files: ['src/**/*.js', 'server.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        Promise: 'readonly',
        Error: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        JSON: 'readonly',
        parseInt: 'readonly',
        parseFloat: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        String: 'readonly',
        Boolean: 'readonly',
        Number: 'readonly',
        Intl: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: {
      // Catch typos and unused imports early
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // var is discouraged; let/const are safer
      'no-var': 'error',
      // Prefer const for variables that are never reassigned
      'prefer-const': ['warn', { destructuring: 'all' }],
      // Catch accidental use of undeclared globals
      'no-undef': 'error',
    },
  },
  {
    // Ignore generated/legacy files that are not being migrated
    ignores: [
      'node_modules/**',
      'public/**',
      'migrations/**',
      'test/**',
      'tests/**',
    ],
  },
];
