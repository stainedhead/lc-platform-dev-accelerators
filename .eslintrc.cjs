module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Error prevention
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      { allowExpressions: true, allowTypedFunctionExpressions: true },
    ],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/strict-boolean-expressions': [
      'warn',
      {
        allowString: false,
        allowNumber: false,
        allowNullableObject: false,
      },
    ],

    // Code quality
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'brace-style': ['error', '1tbs'],
  },
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    '*.js',
    '!.eslintrc.js',
  ],
  overrides: [
    {
      // Production code: Keep strict rules for high quality
      files: ['src/**/*.ts'],
      excludedFiles: ['src/**/mock/**/*.ts'],
      rules: {
        '@typescript-eslint/strict-boolean-expressions': 'error',
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error',
      },
    },
    {
      // Tests and Mock implementations: Relaxed rules for pragmatic testing
      files: ['**/tests/**/*.ts', '**/*.test.ts', '**/mock/**/*.ts', '**/helpers/**/*.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/await-thenable': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-base-to-string': 'warn',
        'no-constant-condition': 'warn',
      },
    },
    {
      // AWS implementations: allow nullable checks for optional AWS SDK responses
      files: ['**/aws/**/*.ts'],
      excludedFiles: ['**/aws/**/*.test.ts'],
      rules: {
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/restrict-template-expressions': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-base-to-string': 'warn',
      },
    },
    {
      // Benchmarks can use console
      files: ['benchmarks/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
