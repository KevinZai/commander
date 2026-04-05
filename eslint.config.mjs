// ESLint flat config — CC Commander
// ESM format, ecmaVersion latest, sourceType module

export default [
  {
    ignores: [
      'node_modules/**',
      'vendor/**',
      'docs/**',
      '.taskmaster/**',
      'coverage/**',
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
];
