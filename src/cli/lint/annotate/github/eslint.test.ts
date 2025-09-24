import type { ESLintOutput } from '../../../adapter/eslint.js';

import { createEslintAnnotations } from './eslint.js';

import type * as GitHub from '@skuba-lib/api/github';

it('should create failure annotations for ESLint errors', () => {
  const eslintOutput: ESLintOutput = {
    errors: [
      {
        filePath: '/skuba/src/index.ts',
        messages: [
          {
            ruleId: '@typescript-eslint/no-unused-vars',
            severity: 2,
            message:
              "'unused' is defined but never used. Allowed unused args must match /^_/u.",
            line: 4,
            column: 3,
            nodeType: 'Identifier',
            messageId: 'unusedVar',
            endLine: 4,
            endColumn: 15,
          },
        ],
      },
    ],
    fixable: false,
    ok: false,
    output: '',
    warnings: [],
  };
  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      end_column: 15,
      end_line: 4,
      message:
        "'unused' is defined but never used. Allowed unused args must match /^_/u.",
      path: '/skuba/src/index.ts',
      start_column: 3,
      start_line: 4,
      title: 'ESLint (@typescript-eslint/no-unused-vars)',
    },
  ];
  const annotations = createEslintAnnotations(eslintOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should create warning annotations for ESLint warnings', () => {
  const eslintOutput: ESLintOutput = {
    errors: [],
    fixable: false,
    ok: true,
    output: '',
    warnings: [
      {
        filePath: '/skuba/src/index.ts',
        messages: [
          {
            ruleId: '@typescript-eslint/no-unused-vars',
            severity: 1,
            message:
              "'unused' is defined but never used. Allowed unused args must match /^_/u.",
            line: 4,
            column: 3,
            nodeType: 'Identifier',
            messageId: 'unusedVar',
            endLine: 4,
            endColumn: 15,
          },
        ],
      },
    ],
  };
  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'warning',
      end_column: 15,
      end_line: 4,
      message:
        "'unused' is defined but never used. Allowed unused args must match /^_/u.",
      path: '/skuba/src/index.ts',
      start_column: 3,
      start_line: 4,
      title: 'ESLint (@typescript-eslint/no-unused-vars)',
    },
  ];
  const annotations = createEslintAnnotations(eslintOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should create both failure and warning annotations for ESLint errors and warnings', () => {
  const eslintOutput: ESLintOutput = {
    errors: [
      {
        filePath: '/skuba/src/index.ts',
        messages: [
          {
            ruleId: '@typescript-eslint/no-unused-vars',
            severity: 2,
            message:
              "'unused' is defined but never used. Allowed unused args must match /^_/u.",
            line: 4,
            column: 3,
            nodeType: 'Identifier',
            messageId: 'unusedVar',
            endLine: 4,
            endColumn: 15,
          },
        ],
      },
    ],
    fixable: false,
    ok: false,
    output: '',
    warnings: [
      {
        filePath: '/skuba/src/index.ts',
        messages: [
          {
            ruleId: '@typescript-eslint/no-unused-vars',
            severity: 1,
            message:
              "'unused' is defined but never used. Allowed unused args must match /^_/u.",
            line: 4,
            column: 3,
            nodeType: 'Identifier',
            messageId: 'unusedVar',
            endLine: 4,
            endColumn: 15,
          },
        ],
      },
    ],
  };
  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      end_column: 15,
      end_line: 4,
      message:
        "'unused' is defined but never used. Allowed unused args must match /^_/u.",
      path: '/skuba/src/index.ts',
      start_column: 3,
      start_line: 4,
      title: 'ESLint (@typescript-eslint/no-unused-vars)',
    },
    {
      annotation_level: 'warning',
      end_column: 15,
      end_line: 4,
      message:
        "'unused' is defined but never used. Allowed unused args must match /^_/u.",
      path: '/skuba/src/index.ts',
      start_column: 3,
      start_line: 4,
      title: 'ESLint (@typescript-eslint/no-unused-vars)',
    },
  ];
  const annotations = createEslintAnnotations(eslintOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});

it('should not specify columns when an annotation spans multiple lines', () => {
  const eslintOutput: ESLintOutput = {
    errors: [
      {
        filePath: 'src/index.ts',
        messages: [
          {
            ruleId: 'jest/no-disabled-tests',
            severity: 2,
            message: 'Skipped test',
            line: 3,
            column: 3,
            nodeType: 'Identifier',
            messageId: 'noDisabledTests',
            endLine: 4,
            endColumn: 15,
          },
        ],
      },
    ],
    fixable: false,
    ok: false,
    output: '',
    warnings: [],
  };

  const expectedAnnotations: GitHub.Annotation[] = [
    {
      annotation_level: 'failure',
      start_line: 3,
      end_line: 4,
      message: 'Skipped test',
      path: 'src/index.ts',
      title: 'ESLint (jest/no-disabled-tests)',
    },
  ];

  const annotations = createEslintAnnotations(eslintOutput);

  expect(annotations).toStrictEqual(expectedAnnotations);
});
