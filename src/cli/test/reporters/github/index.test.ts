import type { AggregatedResult, TestContext } from '@jest/reporters';

import { log } from '../../../../utils/logging.js';

import GitHubReporter from './index.js';

import * as GitHub from '@skuba-lib/api/github';

const reporter = new GitHubReporter();

jest.mock('@skuba-lib/api/github', () => ({
  ...jest.requireActual('@skuba-lib/api/github'),
  createCheckRun: jest.fn(),
}));
jest.mock('../../../../utils/logging');

beforeEach(() => {
  jest.spyOn(process, 'cwd').mockReturnValue('/workdir/skuba');

  process.env.CI = 'true';
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_RUN_NUMBER = '123';
  process.env.GITHUB_TOKEN = 'Hello from GITHUB_TOKEN';
  process.env.GITHUB_WORKFLOW = 'Test';
});

afterEach(jest.resetAllMocks);

const context = new Set<TestContext>();

const failResults: AggregatedResult = {
  numFailedTestSuites: 1,
  numFailedTests: 1,
  numPassedTestSuites: 0,
  numPassedTests: 0,
  numPendingTestSuites: 0,
  numPendingTests: 0,
  numRuntimeErrorTestSuites: 0,
  numTodoTests: 0,
  numTotalTestSuites: 1,
  numTotalTests: 1,
  openHandles: [],
  snapshot: {
    added: 0,
    didUpdate: false,
    failure: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesRemovedList: [],
    filesUnmatched: 0,
    filesUpdated: 0,
    matched: 0,
    total: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0,
  },
  startTime: 1636257984534,
  success: false,
  testResults: [
    {
      leaks: false,
      numFailingTests: 1,
      numPassingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      openHandles: [],
      perfStats: {
        end: 1636257986762,
        runtime: 2159,
        slow: false,
        start: 1636257984603,
        loadTestEnvironmentEnd: 1683542780245,
        loadTestEnvironmentStart: 1683542780198,
        setupAfterEnvEnd: 1683542780312,
        setupAfterEnvStart: 1683542780247,
        setupFilesEnd: 1683542780435,
        setupFilesStart: 1683542780314,
      },
      skipped: false,
      snapshot: {
        added: 0,
        fileDeleted: false,
        matched: 0,
        unchecked: 0,
        uncheckedKeys: [],
        unmatched: 0,
        updated: 0,
      },
      testFilePath: '/workdir/skuba/src/test.test.ts',
      testResults: [
        {
          ancestorTitles: [],
          duration: 5,
          failureDetails: [
            {
              matcherResult: {
                actual: 'b',
                expected: 'a',
                message:
                  '\u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m',
                name: 'toBe',
                pass: false,
              },
            },
          ],
          failureMessages: [
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)\n    at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
          ],
          fullName: 'should output a',
          invocations: 1,
          location: null,
          numPassingAsserts: 0,
          status: 'failed',
          title: 'should output a',
        },
      ],
      failureMessage:
        "\u001b[1m\u001b[31m  \u001b[1m● \u001b[22m\u001b[1mshould output a\u001b[39m\u001b[22m\n\n    \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\n    Expected: \u001b[32m\"a\"\u001b[39m\n    Received: \u001b[31m\"b\"\u001b[39m\n\u001b[2m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 1 |\u001b[39m it(\u001b[32m'should output a'\u001b[39m\u001b[33m,\u001b[39m () \u001b[33m=>\u001b[39m {\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m\u001b[31m\u001b[1m>\u001b[22m\u001b[2m\u001b[39m\u001b[90m 2 |\u001b[39m   expect(\u001b[32m'b'\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[32m'a'\u001b[39m)\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m   |\u001b[39m               \u001b[31m\u001b[1m^\u001b[22m\u001b[2m\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 3 |\u001b[39m })\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 4 |\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m\u001b[22m\n\u001b[2m      \u001b[2mat Object.<anonymous> (\u001b[22m\u001b[2m\u001b[0m\u001b[36msrc/test.test.ts\u001b[39m\u001b[0m\u001b[2m:2:15)\u001b[22m\u001b[2m\u001b[22m\n",
    },
  ],
  wasInterrupted: false,
};

const successResults: AggregatedResult = {
  ...failResults,
  numFailedTestSuites: 0,
  numFailedTests: 0,
  numPassedTestSuites: 1,
  numPassedTests: 1,
  success: true,
  testResults: failResults.testResults[0]
    ? [
        {
          ...failResults.testResults[0],
          numFailingTests: 0,
          numPassingTests: 1,
          testResults: [],
        },
      ]
    : [],
};

const failResultsDisplayNames: AggregatedResult = {
  numFailedTestSuites: 1,
  numFailedTests: 1,
  numPassedTestSuites: 0,
  numPassedTests: 0,
  numPendingTestSuites: 0,
  numPendingTests: 0,
  numRuntimeErrorTestSuites: 0,
  numTodoTests: 0,
  numTotalTestSuites: 1,
  numTotalTests: 1,
  openHandles: [],
  snapshot: {
    added: 0,
    didUpdate: false,
    failure: false,
    filesAdded: 0,
    filesRemoved: 0,
    filesRemovedList: [],
    filesUnmatched: 0,
    filesUpdated: 0,
    matched: 0,
    total: 0,
    unchecked: 0,
    uncheckedKeysByFile: [],
    unmatched: 0,
    updated: 0,
  },
  startTime: 1636257984534,
  success: false,
  testResults: [
    {
      leaks: false,
      numFailingTests: 1,
      numPassingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      openHandles: [],
      perfStats: {
        end: 1636257986762,
        runtime: 2159,
        slow: false,
        start: 1636257984603,
        loadTestEnvironmentEnd: 1683542780245,
        loadTestEnvironmentStart: 1683542780198,
        setupAfterEnvEnd: 1683542780312,
        setupAfterEnvStart: 1683542780247,
        setupFilesEnd: 1683542780435,
        setupFilesStart: 1683542780314,
      },
      skipped: false,
      snapshot: {
        added: 0,
        fileDeleted: false,
        matched: 0,
        unchecked: 0,
        uncheckedKeys: [],
        unmatched: 0,
        updated: 0,
      },
      testFilePath: '/workdir/skuba/src/test.test.ts',
      testResults: [
        {
          ancestorTitles: [],
          duration: 5,
          failureDetails: [
            {
              matcherResult: {
                actual: 'b',
                expected: 'a',
                message:
                  '\u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m',
                name: 'toBe',
                pass: false,
              },
            },
          ],
          failureMessages: [
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)\n    at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
          ],
          fullName: 'should output a',
          invocations: 1,
          location: null,
          numPassingAsserts: 0,
          status: 'failed',
          title: 'should output a',
        },
      ],
      failureMessage:
        "\u001b[1m\u001b[31m  \u001b[1m● \u001b[22m\u001b[1mshould output a\u001b[39m\u001b[22m\n\n    \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\n    Expected: \u001b[32m\"a\"\u001b[39m\n    Received: \u001b[31m\"b\"\u001b[39m\n\u001b[2m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 1 |\u001b[39m it(\u001b[32m'should output a'\u001b[39m\u001b[33m,\u001b[39m () \u001b[33m=>\u001b[39m {\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m\u001b[31m\u001b[1m>\u001b[22m\u001b[2m\u001b[39m\u001b[90m 2 |\u001b[39m   expect(\u001b[32m'b'\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[32m'a'\u001b[39m)\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m   |\u001b[39m               \u001b[31m\u001b[1m^\u001b[22m\u001b[2m\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 3 |\u001b[39m })\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 4 |\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m\u001b[22m\n\u001b[2m      \u001b[2mat Object.<anonymous> (\u001b[22m\u001b[2m\u001b[0m\u001b[36msrc/test.test.ts\u001b[39m\u001b[0m\u001b[2m:2:15)\u001b[22m\u001b[2m\u001b[22m\n",
    },
    {
      displayName: {
        color: 'blue',
        name: 'integration',
      },
      leaks: false,
      numFailingTests: 1,
      numPassingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      openHandles: [],
      perfStats: {
        end: 1636257986762,
        runtime: 2159,
        slow: false,
        start: 1636257984603,
        loadTestEnvironmentEnd: 1683542780245,
        loadTestEnvironmentStart: 1683542780198,
        setupAfterEnvEnd: 1683542780312,
        setupAfterEnvStart: 1683542780247,
        setupFilesEnd: 1683542780435,
        setupFilesStart: 1683542780314,
      },
      skipped: false,
      snapshot: {
        added: 0,
        fileDeleted: false,
        matched: 0,
        unchecked: 0,
        uncheckedKeys: [],
        unmatched: 0,
        updated: 0,
      },
      testFilePath: '/workdir/skuba/src/index.test.ts',
      testResults: [
        {
          ancestorTitles: [],
          duration: 5,
          failureDetails: [
            {
              matcherResult: {
                actual: 'b',
                expected: 'a',
                message:
                  '\u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m',
                name: 'toBe',
                pass: false,
              },
            },
          ],
          failureMessages: [
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workdir/skuba/src/index.test.ts:2:15)\n    at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
          ],
          fullName: 'should output a',
          invocations: 1,
          location: null,
          numPassingAsserts: 0,
          status: 'failed',
          title: 'should output a',
        },
      ],
      failureMessage:
        "\u001b[1m\u001b[31m  \u001b[1m● \u001b[22m\u001b[1mshould output a\u001b[39m\u001b[22m\n\n    \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\n    Expected: \u001b[32m\"a\"\u001b[39m\n    Received: \u001b[31m\"b\"\u001b[39m\n\u001b[2m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 1 |\u001b[39m it(\u001b[32m'should output a'\u001b[39m\u001b[33m,\u001b[39m () \u001b[33m=>\u001b[39m {\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m\u001b[31m\u001b[1m>\u001b[22m\u001b[2m\u001b[39m\u001b[90m 2 |\u001b[39m   expect(\u001b[32m'b'\u001b[39m)\u001b[33m.\u001b[39mtoBe(\u001b[32m'a'\u001b[39m)\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m   |\u001b[39m               \u001b[31m\u001b[1m^\u001b[22m\u001b[2m\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 3 |\u001b[39m })\u001b[33m;\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m    \u001b[0m \u001b[90m 4 |\u001b[39m\u001b[0m\u001b[22m\n\u001b[2m\u001b[22m\n\u001b[2m      \u001b[2mat Object.<anonymous> (\u001b[22m\u001b[2m\u001b[0m\u001b[36msrc/test.test.ts\u001b[39m\u001b[0m\u001b[2m:2:15)\u001b[22m\u001b[2m\u001b[22m\n",
    },
  ],
  wasInterrupted: false,
};

it('should create check runs if the correct environment variables are set', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toHaveBeenCalled();
});

it('should not create check runs if the correct environment variables are not set', async () => {
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;

  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
});

it('should create a successful check run when there are no annotations', async () => {
  await reporter.onRunComplete(context, successResults);

  expect(GitHub.createCheckRun).toHaveBeenCalledTimes(1);
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test',
    annotations: [],
    conclusion: 'success',
    summary: '`skuba test` passed.',
    title: 'Test #123 passed',
  });
});

it('should create one annotated check run when there are no display names', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toHaveBeenCalledTimes(1);
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test',
    annotations: [
      {
        annotation_level: 'failure',
        path: 'src/test.test.ts',
        start_line: 2,
        end_line: 2,
        start_column: 15,
        end_column: 15,
        message: expect.any(String),
        title: 'Jest',
      },
    ],
    conclusion: 'failure',
    summary: '`skuba test` found issues that require triage.',
    title: 'Test #123 failed',
  });
});

it('should create an annotated check run per display name', async () => {
  await reporter.onRunComplete(context, failResultsDisplayNames);

  expect(GitHub.createCheckRun).toHaveBeenCalledTimes(2);
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test',
    annotations: [
      {
        annotation_level: 'failure',
        path: 'src/test.test.ts',
        start_line: 2,
        end_line: 2,
        start_column: 15,
        end_column: 15,
        message: expect.any(String),
        title: 'Jest',
      },
    ],
    conclusion: 'failure',
    summary: '`skuba test` found issues that require triage.',
    title: 'Test #123 failed',
  });
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test (integration)',
    annotations: [
      {
        annotation_level: 'failure',
        path: 'src/index.test.ts',
        start_line: 2,
        end_line: 2,
        start_column: 15,
        end_column: 15,
        message: expect.any(String),
        title: 'Jest',
      },
    ],
    conclusion: 'failure',
    summary: '`skuba test` found issues that require triage.',
    title: 'Test #123 failed',
  });
});

it('should log a warning when it fails to create annotations', async () => {
  const err = new Error('Badness!');

  jest.mocked(GitHub.createCheckRun).mockRejectedValue(err);

  await reporter.onRunComplete(context, failResults);

  const logs = [
    null,
    jest.mocked(log.warn).mock.calls,
    jest
      .mocked(log.subtle)
      .mock.calls[0]?.join('\n')
      .replace(/(at Object\.\<anonymous\>)[\s\S]+$/, '$1...'),
    jest.mocked(log.subtle).mock.calls.slice(1),
    null,
  ]
    .flat()
    .join('\n');

  expect(logs).toMatchInlineSnapshot(`
    "
    Failed to report test results to GitHub.
    Error: Badness!
        at Object.<anonymous>...
    Last request:
    {"name":"skuba/test","annotations":[{"annotation_level":"failure","path":"src/test.test.ts","start_line":2,"end_line":2,"start_column":15,"end_column":15,"message":"Error: expect(received).toBe(expected) // Object.is equality\\n\\nExpected: \\"a\\"\\nReceived: \\"b\\"\\n    at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)\\n    at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)\\n    at new Promise (<anonymous>)\\n    at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)\\n    at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)\\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\\n    at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)\\n    at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)\\n    at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)\\n    at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)","title":"Jest"}],"conclusion":"failure","summary":"\`skuba test\` found issues that require triage.","title":"Test #123 failed"}
    "
  `);
});
