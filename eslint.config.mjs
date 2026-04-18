// ESLint flat config — CC Commander
// ESM format, ecmaVersion latest, sourceType module

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const testQualityPlugin = require('./eslint-rules/test-quality.cjs');

export default [
  {
    ignores: [
      'node_modules/**',
      'vendor/**',
      'docs/**',
      '.taskmaster/**',
      'coverage/**',
      'skills/browse/test/**',
      'apps/**',                       // mcp-server-cloud has its own eslint + TS config
      'commander/mcp-server/dist/**',
      '.claude/worktrees/**',          // embedded worktrees (fallback safety)
      'site/**',                       // next.js site has its own config
      'dashboard/**',                  // vite dashboard has its own config
    ],
  },
  {
    files: ['commander/**/*.js', 'lib/**/*.js', 'bin/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'eqeqeq': ['warn', 'always', { null: 'ignore' }],
      'no-throw-literal': 'error',
      'prefer-const': ['warn', { destructuring: 'all' }],
    },
  },
  // ── Test-quality rules (test files only) ───────────────────────────────────
  {
    files: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/*.test.mjs',
      '**/*.spec.js',
      '**/*.spec.ts',
      '**/tests/**/*.js',
      '**/tests/**/*.ts',
      '**/tests/**/*.mjs',
    ],
    plugins: {
      'test-quality': testQualityPlugin,
    },
    rules: {
      'test-quality/no-unscoped-service-test': 'error',
      'test-quality/require-error-code-assertion': 'warn',
      'test-quality/no-mock-echo': 'warn',
    },
  },
];
