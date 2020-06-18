module.exports = {
  extends: [
    'seek',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  ignorePatterns: ['**/.eslintrc.js'],
  overrides: [
    {
      files: ['**/jest.*config*.js'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'import/no-unresolved': 'off',
      },
    },
    {
      files: ['**/*.test.ts'],
      rules: {
        // Allow `any` in tests
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',

        // Allow e.g. expect(logger.child).toBeCalledWith
        '@typescript-eslint/unbound-method': 'off',
      },
    },
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['eslint-plugin-tsdoc'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-floating-promises': 'error',

    'import/no-duplicates': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
        },
        'newlines-between': 'always',
        pathGroups: [
          {
            group: 'external',
            pattern: 'src',
            position: 'after',
          },
          {
            group: 'external',
            pattern: 'src/**',
            position: 'after',
          },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],

    'jest/expect-expect': 'off',
    'jest/no-deprecated-functions': 'error',
    'jest/prefer-spy-on': 'error',
    'jest/prefer-strict-equal': 'off',
    'jest/prefer-to-be-null': 'error',
    'jest/prefer-to-be-undefined': 'error',
    'jest/prefer-to-contain': 'error',
    'jest/prefer-to-have-length': 'error',
    'jest/prefer-todo': 'error',
    'jest/valid-title': 'error',

    'no-use-before-define': 'off',
    'sort-imports': [
      'error',
      {
        ignoreDeclarationSort: true,
      },
    ],
  },
};
