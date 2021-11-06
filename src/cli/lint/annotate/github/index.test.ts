import { mocked } from 'ts-jest/utils';

import * as GitHub from '../../../../api/github';
import { ESLintOutput } from '../../../../cli/adapter/eslint';
import { PrettierOutput } from '../../../../cli/adapter/prettier';
import { StreamInterceptor } from '../../../../cli/lint/external';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

import { createGitHubAnnotations } from '.';

jest.mock('../../../../utils/logging');
jest.mock('../../../../api/github');

jest.mock('./eslint');
jest.mock('./prettier');
jest.mock('./tsc');

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
  ok: false,
  output: '',
  warnings: [],
};

const prettierOutput: PrettierOutput = {
  ok: false,
  result: {
    errored: [{ filepath: 'src/index.ts' }],
    count: 1,
    touched: [],
    unparsed: [],
  },
};

const tscOk = false;
const mockOutput = jest.fn<string, any>();

const tscOutputStream = {
  output: mockOutput,
} as unknown as StreamInterceptor;

const mockEslintAnnotations: GitHub.Annotation[] = [
  {
    annotation_level: 'failure',
    end_column: 15,
    end_line: 4,
    message:
      "'unused' is defined but never used. Allowed unused args must match /^_/u.",
    path: '/skuba/src/index.ts',
    start_column: 3,
    start_line: 4,
    title: '@typescript-eslint/no-unused-vars',
  },
];

const mockPrettierAnnotations: GitHub.Annotation[] = [
  {
    annotation_level: 'failure',
    start_line: 0,
    end_line: 0,
    path: 'src/index.ts',
    message: 'Prettier found an issue with this file',
  },
];

const mockTscAnnotations: GitHub.Annotation[] = [
  {
    annotation_level: 'failure',
    path: 'src/index.ts',
    start_line: 1,
    end_line: 1,
    start_column: 1,
    end_column: 1,
    message: "TS6133: 'missing' is declared but its value is never read.",
  },
];

beforeEach(() => {
  process.env.CI = 'true';
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_RUN_NUMBER = '123';
  process.env.GITHUB_TOKEN = 'Hello from GITHUB_TOKEN';
  process.env.GITHUB_WORKFLOW = 'Test';

  mocked(createEslintAnnotations).mockReturnValue(mockEslintAnnotations);
  mocked(createPrettierAnnotations).mockReturnValue(mockPrettierAnnotations);
  mocked(createTscAnnotations).mockReturnValue(mockTscAnnotations);
});

afterEach(() => {
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_RUN_NUMBER;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_WORKFLOW;

  jest.resetAllMocks();
});

it('should return immediately if the required environment variables are not set', async () => {
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;

  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
});

it('should call createEslintAnnotations with the ESLint output', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
  );

  expect(createEslintAnnotations).toBeCalledWith(eslintOutput);
});

it('should call createPrettierAnnotations with the Prettier output', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
  );

  expect(createPrettierAnnotations).toBeCalledWith(prettierOutput);
});

it('should call createTscAnnotations with tscOk and tscOutputStream', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
  );

  expect(createTscAnnotations).toBeCalledWith(tscOk, tscOutputStream);
});

it('should combine all the annotations into an array for the check run', async () => {
  const expectedAnnotations: GitHub.Annotation[] = [
    ...mockEslintAnnotations,
    ...mockPrettierAnnotations,
    ...mockTscAnnotations,
  ];

  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    summary: expect.any(String),
    annotations: expectedAnnotations,
    conclusion: expect.any(String),
    title: 'Test #123 failed',
  });
});

it('should set the conclusion to failure if any output is not ok', async () => {
  await createGitHubAnnotations(
    { ...eslintOutput, ok: false },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    summary: expect.any(String),
    annotations: expect.any(Array),
    conclusion: 'failure',
    title: 'Test #123 failed',
  });
});

it('should set the conclusion to success if all outputs are ok', async () => {
  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    summary: expect.any(String),
    annotations: expect.any(Array),
    conclusion: 'success',
    title: 'Test #123 passed',
  });
});

it('should report that skuba lint failed if the output is not ok', async () => {
  const expectedSummary = '`skuba lint` found issues that require triage.';

  await createGitHubAnnotations(
    { ...eslintOutput, ok: false },
    { ...prettierOutput, ok: false },
    false,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    summary: expectedSummary,
    annotations: expect.any(Array),
    conclusion: expect.any(String),
    title: expect.any(String),
  });
});

it('should set the summary to `Lint passed` if all outputs are ok', async () => {
  const expectedSummary = '`skuba lint` passed.';

  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
  );

  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    summary: expectedSummary,
    annotations: expect.any(Array),
    conclusion: expect.any(String),
    title: expect.any(String),
  });
});
