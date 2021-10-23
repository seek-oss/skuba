import { mocked } from 'ts-jest/utils';

import { GitHub } from '../../../..';
import { ESLintOutput } from '../../../../cli/adapter/eslint';
import { PrettierOutput } from '../../../../cli/adapter/prettier';
import { StreamInterceptor } from '../../../../cli/lint/external';

import { createEslintAnnotations } from './eslint';
import { createPrettierAnnotations } from './prettier';
import { createTscAnnotations } from './tsc';

import { createGitHubAnnotations } from '.';

jest.mock('../../../../utils/logging');
jest.mock('../../../..');
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

const summary = 'a summary';

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

const setEnvironmentVariables = () => {
  process.env.BUILDKITE_BUILD_NUMBER = '23';
};

beforeEach(() => {
  mocked(GitHub.isGitHubAnnotationsEnabled).mockReturnValue(true);
  mocked(createEslintAnnotations).mockReturnValue(mockEslintAnnotations);
  mocked(createPrettierAnnotations).mockReturnValue(mockPrettierAnnotations);
  mocked(createTscAnnotations).mockReturnValue(mockTscAnnotations);
});

afterEach(() => {
  jest.resetAllMocks();
  delete process.env.BUILDKITE_BUILD_NUMBER;
});

it('should call call createEslintAnnotations with the eslint output', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(createEslintAnnotations).toBeCalledWith(eslintOutput);
});

it('should call call createPrettierAnnotations with the prettier output', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(createPrettierAnnotations).toBeCalledWith(prettierOutput);
});

it('should call call createTscAnnotations with the tscok and tscOutputStream', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(createTscAnnotations).toBeCalledWith(tscOk, tscOutputStream);
});

it('should combine all the annotations into an array and call the createCheckRun method with the array', async () => {
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
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expectedAnnotations,
    expect.anything(),
  );
});

it('should set the status to failed if any of the outputs are not ok', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    'failure',
  );
});

it('should set the status to success if all outputs are ok', async () => {
  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expect.anything(),
    expect.anything(),
    expect.anything(),
    'success',
  );
});

it('should create a title with the number of annotations and buildkite build number', async () => {
  setEnvironmentVariables();
  const expectedTitle = 'Build #23 failed (3 annotations added)';

  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expectedTitle,
    expect.anything(),
    expect.anything(),
    expect.anything(),
  );
});

it('should create a title with passed and 0 annotations added when the outputs all return ok', async () => {
  mocked(createEslintAnnotations).mockReturnValue([]);
  mocked(createPrettierAnnotations).mockReturnValue([]);
  mocked(createTscAnnotations).mockReturnValue([]);

  setEnvironmentVariables();
  const expectedTitle = 'Build #23 passed (0 annotations added)';

  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expectedTitle,
    expect.anything(),
    expect.anything(),
    expect.anything(),
  );
});

it('should successfully create a title with 1 annotation (without the s) added', async () => {
  mocked(createPrettierAnnotations).mockReturnValue([]);
  mocked(createTscAnnotations).mockReturnValue([]);

  setEnvironmentVariables();
  const expectedTitle = 'Build #23 passed (1 annotation added)';

  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expectedTitle,
    expect.anything(),
    expect.anything(),
    expect.anything(),
  );
});

it('should use the summary in the createCheckRun if the outputs are not ok', async () => {
  await createGitHubAnnotations(
    eslintOutput,
    prettierOutput,
    tscOk,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expect.anything(),
    summary,
    expect.anything(),
    expect.anything(),
  );
});

it('should use set the summary as Lint passed if the outputs are all ok', async () => {
  const expectedSummary = 'Lint passed';

  await createGitHubAnnotations(
    { ...eslintOutput, ok: true },
    { ...prettierOutput, ok: true },
    true,
    tscOutputStream,
    summary,
  );

  expect(GitHub.createCheckRun).toBeCalledWith(
    expect.anything(),
    expect.anything(),
    expectedSummary,
    expect.anything(),
    expect.anything(),
  );
});
