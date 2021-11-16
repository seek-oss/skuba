import { SerializableError, TestResult } from '@jest/test-result';

import { createAnnotations } from './annotations';

jest.spyOn(process, 'cwd').mockReturnValue('/workdir/skuba');

it('should create annotations from Jest test results', () => {
  const testResult = {
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
  } as TestResult;

  const annotations = createAnnotations([testResult]);
  expect(annotations).toStrictEqual([
    {
      annotation_level: 'failure',
      path: 'src/test.test.ts',
      start_line: 2,
      end_line: 2,
      start_column: 15,
      end_column: 15,
      message:
        'Error: \x1B[2mexpect(\x1B[22m\x1B[31mreceived\x1B[39m\x1B[2m).\x1B[22mtoBe\x1B[2m(\x1B[22m\x1B[32mexpected\x1B[39m\x1B[2m) // Object.is equality\x1B[22m\n' +
        '\n' +
        'Expected: \x1B[32m"a"\x1B[39m\n' +
        'Received: \x1B[31m"b"\x1B[39m\n' +
        '    at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)\n' +
        '    at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)\n' +
        '    at new Promise (<anonymous>)\n' +
        '    at callAsyncCircusFn (/workdir/skuba/node_modules/jest-circus/build/utils.js:315:10)\n' +
        '    at _callCircusTest (/workdir/skuba/node_modules/jest-circus/build/run.js:218:40)\n' +
        '    at processTicksAndRejections (node:internal/process/task_queues:96:5)\n' +
        '    at _runTest (/workdir/skuba/node_modules/jest-circus/build/run.js:155:3)\n' +
        '    at _runTestsForDescribeBlock (/workdir/skuba/node_modules/jest-circus/build/run.js:66:9)\n' +
        '    at run (/workdir/skuba/node_modules/jest-circus/build/run.js:25:3)\n' +
        '    at runAndTransformResultsToJestFormat (/workdir/skuba/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapterInit.js:167:21)',
      title: 'Jest',
    },
  ]);
});

it('should create annotations from Jest exec errors', () => {
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
  const testResult = {
    failureMessage:
      "  \u001b[1m● \u001b[22mTest suite failed to run\n\n    \u001b[96msrc/test.ts\u001b[0m:\u001b[93m1\u001b[0m:\u001b[93m1\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS6133: \u001b[0m'a' is declared but its value is never read.\n\n    \u001b[7m1\u001b[0m import { a } from 'b';\n    \u001b[7m \u001b[0m \u001b[91m~~~~~~~~~~~~~~~~~~~~~~\u001b[0m\n    \u001b[96msrc/test.ts\u001b[0m:\u001b[93m1\u001b[0m:\u001b[93m19\u001b[0m - \u001b[91merror\u001b[0m\u001b[90m TS2307: \u001b[0mCannot find module 'b' or its corresponding type declarations.\n\n    \u001b[7m1\u001b[0m import { a } from 'b';\n    \u001b[7m \u001b[0m \u001b[91m                  ~~~\u001b[0m\n",
    leaks: false,
    numFailingTests: 0,
    numPassingTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    openHandles: [],
    perfStats: {
      end: 0,
      runtime: 0,
      slow: false,
      start: 0,
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
    testExecError: error,
    testFilePath: '/workdir/skuba/src/test.test.ts',
    testResults: [],
  } as TestResult;

  const annotations = createAnnotations([testResult]);
  expect(annotations).toStrictEqual([
    {
      annotation_level: 'failure',
      path: 'src/test.test.ts',
      start_line: 1,
      end_line: 1,
      message:
        "\x1B[96msrc/test.ts\x1B[0m:\x1B[93m1\x1B[0m:\x1B[93m1\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS6133: \x1B[0m'a' is declared but its value is never read.\n" +
        '\n' +
        "\x1B[7m1\x1B[0m import { a } from 'b';\n" +
        '\x1B[7m \x1B[0m \x1B[91m~~~~~~~~~~~~~~~~~~~~~~\x1B[0m\n' +
        "\x1B[96msrc/test.ts\x1B[0m:\x1B[93m1\x1B[0m:\x1B[93m19\x1B[0m - \x1B[91merror\x1B[0m\x1B[90m TS2307: \x1B[0mCannot find module 'b' or its corresponding type declarations.\n" +
        '\n' +
        "\x1B[7m1\x1B[0m import { a } from 'b';\n" +
        '\x1B[7m \x1B[0m \x1B[91m                  ~~~\x1B[0m',
      title: 'Jest',
    },
  ]);
});
