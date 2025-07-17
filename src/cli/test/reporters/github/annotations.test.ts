import type { SerializableError, TestResult } from '@jest/test-result';

import { createAnnotations } from './annotations.js';

jest.spyOn(process, 'cwd').mockReturnValue('/workdir/skuba');

const COMMON_TEST_RESULT_FIELDS = {
  leaks: false,
  numFailingTests: 1,
  numPassingTests: 0,
  numPendingTests: 0,
  numTodoTests: 0,
  openHandles: [],
  perfStats: {
    end: 1636247736632,
    runtime: 2646,
    slow: false,
    start: 1636247733986,
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
} satisfies Partial<TestResult>;

it('should create annotation from Jest test failure', () => {
  const testResult: TestResult = {
    ...COMMON_TEST_RESULT_FIELDS,
    testFilePath: '/workdir/skuba/src/test.test.ts',
    testResults: [
      {
        ancestorTitles: [],
        duration: 3,
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
  };

  const annotations = createAnnotations([testResult]);
  expect(annotations).toMatchInlineSnapshot(`
    [
      {
        "annotation_level": "failure",
        "end_column": 15,
        "end_line": 2,
        "message": "Error: expect(received).toBe(expected) // Object.is equality

    Expected: "a"
    Received: "b"
        at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)
        at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)
        at new Promise (<anonymous>)
        at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)
        at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)
        at processTicksAndRejections (node:internal/process/task_queues:96:5)
        at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)
        at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)
        at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)
        at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)",
        "path": "src/test.test.ts",
        "start_column": 15,
        "start_line": 2,
        "title": "Jest",
      },
    ]
  `);
});

it('should create annotation from Jest timeout', () => {
  const testResult: TestResult = {
    ...COMMON_TEST_RESULT_FIELDS,
    testFilePath: '/workdir/skuba/src/test.test.ts',
    testResults: [
      {
        ancestorTitles: ['someFunction'],
        duration: 5002,
        failureDetails: [
          {
            message:
              'thrown: "Exceeded timeout of 5000 ms for a test.\nUse jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test."',
          },
        ],
        failureMessages: [
          'Error: thrown: "Exceeded timeout of 5000 ms for a test.\nUse jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test."\n    at /workdir/skuba/src/test.test.ts:55:6\n    at _dispatchDescribe (/workdir/skuba/node_modules/jest-circus/build/index.js:98:26)\n    at describe (/workdir/skuba/node_modules/jest-circus/build/index.js:60:5)\n    at Object.<anonymous> (/workdir/skuba/src/test.test.ts:21:1)\n    at Runtime._execModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1646:24)\n    at Runtime._loadModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1185:12)\n    at Runtime.requireModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1009:12)\n    at jestAdapter (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:13)\n    at runTestInternal (/workdir/skuba/node_modules/jest-runner/build/runTest.js:389:16)\n    at runTest (/workdir/skuba/node_modules/jest-runner/build/runTest.js:475:34)',
        ],
        fullName: 'someFunction should output a',
        invocations: 1,
        location: null,
        numPassingAsserts: 0,
        status: 'failed',
        title: 'should output a',
      },
    ],
  };

  const annotations = createAnnotations([testResult]);
  expect(annotations).toMatchInlineSnapshot(`
    [
      {
        "annotation_level": "failure",
        "end_column": 6,
        "end_line": 55,
        "message": "Error: thrown: "Exceeded timeout of 5000 ms for a test.
    Use jest.setTimeout(newTimeout) to increase the timeout value, if this is a long-running test."
        at /workdir/skuba/src/test.test.ts:55:6
        at _dispatchDescribe (/workdir/skuba/node_modules/jest-circus/build/index.js:98:26)
        at describe (/workdir/skuba/node_modules/jest-circus/build/index.js:60:5)
        at Object.<anonymous> (/workdir/skuba/src/test.test.ts:21:1)
        at Runtime._execModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1646:24)
        at Runtime._loadModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1185:12)
        at Runtime.requireModule (/workdir/skuba/node_modules/jest-runtime/build/index.js:1009:12)
        at jestAdapter (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:13)
        at runTestInternal (/workdir/skuba/node_modules/jest-runner/build/runTest.js:389:16)
        at runTest (/workdir/skuba/node_modules/jest-runner/build/runTest.js:475:34)",
        "path": "src/test.test.ts",
        "start_column": 6,
        "start_line": 55,
        "title": "Jest",
      },
    ]
  `);
});

it('should create annotation from Jest exec error', () => {
  const error = {
    message:
      "\x1B[96msrc/test.ts\x1B[0m:\x1B[93m1\x1B[0m:\x1B[93m1\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS6133: \x1B[0m'a' is declared but its value is never read.\n" +
      '\n' +
      "\x1B[7m1\x1B[0m import { a } from 'b';\n" +
      '\x1B[7m \x1B[0m \x1B[91m~~~~~~~~~~~~~~~~~~~~~~\x1B[0m\n' +
      "\x1B[96msrc/test.ts\x1B[0m:\x1B[93m1\x1B[0m:\x1B[93m19\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS2307: \x1B[0mCannot find module 'b' or its corresponding type declarations.\n" +
      '\n' +
      "\x1B[7m1\x1B[0m import { a } from 'b';\n" +
      '\x1B[7m \x1B[0m \x1B[91m                  ~~~\x1B[0m',
  } as SerializableError;

  // Prefer `failureMessage` for its "Test suite failed to run" headline
  const testResult: TestResult = {
    ...COMMON_TEST_RESULT_FIELDS,
    failureMessage:
      "  \u001b[1m● \u001b[22mTest suite failed to run\n\n    \u001b[96msrc/test.ts\u001b[0m:\u001b[93m1\u001b[0m:\u001b[93m1\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS6133: \u001b[0m'a' is declared but its value is never read.\n\n    \u001b[7m1\u001b[0m import { a } from 'b';\n    \u001b[7m \u001b[0m \u001b[91m~~~~~~~~~~~~~~~~~~~~~~\u001b[0m\n    \u001b[96msrc/test.ts\u001b[0m:\u001b[93m1\u001b[0m:\u001b[93m19\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS2307: \u001b[0mCannot find module 'b' or its corresponding type declarations.\n\n    \u001b[7m1\u001b[0m import { a } from 'b';\n    \u001b[7m \u001b[0m \u001b[91m                  ~~~\u001b[0m\n",
    testExecError: error,
    testFilePath: '/workdir/skuba/src/test.test.ts',
    testResults: [],
  };

  const annotations = createAnnotations([testResult]);
  expect(annotations).toMatchInlineSnapshot(`
    [
      {
        "annotation_level": "failure",
        "end_line": 1,
        "message": "  ● Test suite failed to run

    src/test.ts:1:1 - error TS6133: 'a' is declared but its value is never read.

    1 import { a } from 'b';
      ~~~~~~~~~~~~~~~~~~~~~~
    src/test.ts:1:19 - error TS2307: Cannot find module 'b' or its corresponding type declarations.

    1 import { a } from 'b';
                        ~~~",
        "path": "src/test.test.ts",
        "start_line": 1,
        "title": "Jest",
      },
    ]
  `);

  // Fall back on the off chance we have no `failureMessage`
  const testResultWithoutFailureMessage: TestResult = {
    ...testResult,
    failureMessage: null,
  };

  const annotationsForNoFailureMessage = createAnnotations([
    testResultWithoutFailureMessage,
  ]);
  expect(annotationsForNoFailureMessage).toMatchInlineSnapshot(`
    [
      {
        "annotation_level": "failure",
        "end_line": 1,
        "message": "src/test.ts:1:1 - error TS6133: 'a' is declared but its value is never read.

    1 import { a } from 'b';
      ~~~~~~~~~~~~~~~~~~~~~~
    src/test.ts:1:19 - error TS2307: Cannot find module 'b' or its corresponding type declarations.

    1 import { a } from 'b';
                        ~~~",
        "path": "src/test.test.ts",
        "start_line": 1,
        "title": "Jest",
      },
    ]
  `);
});
