import type { AggregatedResult, Context } from '@jest/reporters';

import * as GitHub from '../../../../api/github';
import { log } from '../../../../utils/logging';

import { createAnnotations } from './annotations';

import { default as GitHubReporter } from '.';

const reporter = new GitHubReporter();

jest.mock('../../../../api/github');
jest.mock('./annotations');
jest.mock('../../../../utils/logging');

const annotations: GitHub.Annotation[] = [
  {
    annotation_level: 'failure',
    path: 'src/test.test.ts',
    start_line: 2,
    end_line: 2,
    start_column: 15,
    end_column: 15,
    message: 'jest error',
    title: 'Jest',
  },
];

beforeEach(() => {
  process.env.CI = 'true';
  process.env.GITHUB_ACTIONS = 'true';
  process.env.GITHUB_RUN_NUMBER = '123';
  process.env.GITHUB_TOKEN = 'Hello from GITHUB_TOKEN';
  process.env.GITHUB_WORKFLOW = 'Test';

  (createAnnotations as jest.Mock).mockReturnValue(annotations);
});

afterEach(() => {
  jest.resetAllMocks();
});

let context: Set<Context>;

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
      testFilePath: '/workDir/skuba/src/test.test.ts',
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
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workDir/skuba/src/test.test.ts:2:15)\n    at Promise.then.completed (/workDir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workDir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workDir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workDir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workDir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workDir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workDir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
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
      testFilePath: '/workDir/skuba/src/test.test.ts',
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
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workDir/skuba/src/test.test.ts:2:15)\n    at Promise.then.completed (/workDir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workDir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workDir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workDir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workDir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workDir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workDir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
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
      testFilePath: '/workDir/skuba/src/index.test.ts',
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
            'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).\u001b[22mtoBe\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m) // Object.is equality\u001b[22m\n\nExpected: \u001b[32m"a"\u001b[39m\nReceived: \u001b[31m"b"\u001b[39m\n    at Object.<anonymous> (/workDir/skuba/src/index.test.ts:2:15)\n    at Promise.then.completed (/workDir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n    at new Promise (<anonymous>)\n    at callAsyncCircusFn (/workDir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n    at _callCircusTest (/workDir/skuba/node_modules/jest-circus/build/run.js:218:40)\n    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n    at _runTest (/workDir/skuba/node_modules/jest-circus/build/run.js:155:3)\n    at _runTestsForDescribeBlock (/workDir/skuba/node_modules/jest-circus/build/run.js:66:9)\n    at run (/workDir/skuba/node_modules/jest-circus/build/run.js:25:3)\n    at runAndTransformResultsToJestFormat (/workDir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
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

it('should call GitHub createCheckRun if the correct environment variables are set', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toBeCalled();
});

it('should not call GitHub createCheckRun if the correct environment variables are not set', async () => {
  delete process.env.CI;
  delete process.env.GITHUB_ACTIONS;
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).not.toBeCalled();
});

it('should call GitHub createCheckRun with the annotations returned from createAnnotations', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toBeCalledTimes(1);
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    annotations,
    conclusion: expect.any(String),
    summary: expect.any(String),
    title: expect.any(String),
  });
});

it('should call GitHub createCheckRun with a failing title, conclusion and summary if createAnnotations returns annotations', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toBeCalledTimes(1);
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    annotations: expect.any(Array),
    conclusion: 'failure',
    summary: '`skuba test` found issues that require triage.',
    title: 'Test #123 failed',
  });
});

it('should call GitHub createCheckRun with a successful title, conclusion and summary if createAnnotations does not return annotations', async () => {
  (createAnnotations as jest.Mock).mockReturnValue([]);
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toBeCalledTimes(1);
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: expect.any(String),
    annotations: expect.any(Array),
    conclusion: 'success',
    summary: '`skuba test` passed.',
    title: 'Test #123 passed',
  });
});

it('should call GitHub createCheckRun only once with the default title `skuba test` when there are no display names in tests', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(GitHub.createCheckRun).toBeCalledTimes(1);
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: 'skuba/test',
    annotations: expect.any(Array),
    conclusion: expect.any(String),
    summary: expect.any(String),
    title: expect.any(String),
  });
});

it('should call createAnnotations only once with all the testResults when there are no display names in tests', async () => {
  await reporter.onRunComplete(context, failResults);

  expect(createAnnotations).toBeCalledTimes(1);
  expect(createAnnotations).toBeCalledWith(failResults.testResults);
});

it('should sort tests by display name and call createAnnotations with each group', async () => {
  await reporter.onRunComplete(context, failResultsDisplayNames);

  expect(createAnnotations).toBeCalledTimes(2);
  expect(createAnnotations).toBeCalledWith([
    failResultsDisplayNames.testResults[0],
  ]);
  expect(createAnnotations).toBeCalledWith([
    failResultsDisplayNames.testResults[1],
  ]);
});

it('should sort tests by display name and call GitHub.createCheckRun with each group returned from createAnnotations', async () => {
  const moreAnnotations = [...annotations, ...annotations];
  (createAnnotations as jest.Mock)
    .mockReturnValueOnce(annotations)
    .mockReturnValueOnce(moreAnnotations);

  await reporter.onRunComplete(context, failResultsDisplayNames);

  expect(GitHub.createCheckRun).toBeCalledTimes(2);
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: 'skuba/test',
    annotations,
    conclusion: expect.any(String),
    summary: expect.any(String),
    title: expect.any(String),
  });
  expect(GitHub.createCheckRun).toBeCalledWith({
    name: 'skuba/test (integration)',
    annotations: moreAnnotations,
    conclusion: expect.any(String),
    summary: expect.any(String),
    title: expect.any(String),
  });
});

it('should log a warning when it fails to create annotations', async () => {
  (GitHub.createCheckRun as jest.Mock).mockRejectedValue(new Error());
  await reporter.onRunComplete(context, failResults);

  expect(log.warn).toBeCalled();
});
