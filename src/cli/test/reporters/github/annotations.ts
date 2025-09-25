import path from 'path';
import { stripVTControlCharacters as stripAnsi } from 'util';

import type { TestResult } from '@jest/test-result';
import dedent from 'ts-dedent';

import type * as GitHub from '@skuba-lib/api/github';

/**
 * Matches the first stack trace location in a Jest failure message.
 *
 * For example, given the following input message:
 *
 * ```console
 * Error: expect(received).toBe(expected) // Object.is equality
 *
 * Expected: "a"
 * Received: "b"
 *     at Object.<anonymous> (/workdir/skuba/src/test.test.ts:2:15)
 *     at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)
 *     ...
 * ```
 *
 * or:
 *
 * ```console
 * Error: expect(received).toBe(expected) // Object.is equality
 *
 * Expected: "a"
 * Received: "b"
 *     at /workdir/skuba/src/test.test.ts:2:15
 *     at Promise.then.completed (/workdir/skuba/node_modules/jest-circus/build/utils.js:390:28)
 *     ...
 * ```
 *
 * This pattern will produce the following matches:
 *
 * 1. /workdir/skuba/src/test.test.ts
 * 2. 2
 * 2. 15
 */
const JEST_LOCATION_REGEX = /\n +at (.+\()?(.+?):(\d+):(\d+)/;

export const createAnnotations = (
  testResults: TestResult[],
): GitHub.Annotation[] => {
  const cwd = process.cwd();

  return testResults.flatMap((testResult) => {
    if (testResult.testExecError) {
      return {
        annotation_level: 'failure',
        path: path.relative(cwd, testResult.testFilePath),
        start_line: 1,
        end_line: 1,
        message: stripAnsi(
          testResult.failureMessage
            ? dedent(testResult.failureMessage)
            : testResult.testExecError.message,
        ),
        title: 'Jest',
      };
    }

    if (testResult.numFailingTests > 0) {
      return testResult.testResults.flatMap((assertionResult) =>
        assertionResult.failureMessages.flatMap((failureMessage) => {
          const match = JEST_LOCATION_REGEX.exec(failureMessage);
          if (match?.length === 5 && match[2]) {
            return {
              annotation_level: 'failure',
              path: path.relative(cwd, match[2]),
              start_line: Number(match[3]),
              end_line: Number(match[3]),
              start_column: Number(match[4]),
              end_column: Number(match[4]),
              message: stripAnsi(failureMessage),
              title: 'Jest',
            };
          }

          return [];
        }),
      );
    }

    return [];
  });
};

const DEFAULT_DISPLAY_NAME = Symbol('DEFAULT_DISPLAY_NAME');

interface AnnotationEntry {
  annotations: GitHub.Annotation[];
  displayName: string | undefined;
}

export const generateAnnotationEntries = (
  testResults: TestResult[],
): AnnotationEntry[] => {
  type ResultsByDisplayName = Record<string | symbol, TestResult[]>;

  // Group test results by display name.
  const resultsByDisplayName = testResults.reduce<ResultsByDisplayName>(
    (acc, result) => {
      const displayName = result.displayName?.name ?? DEFAULT_DISPLAY_NAME;

      (acc[displayName] ??= []).push(result);

      return acc;
    },
    {},
  );

  const defaultResults = resultsByDisplayName[DEFAULT_DISPLAY_NAME];

  const entries = [
    ...(defaultResults?.length ? ([[undefined, defaultResults]] as const) : []),
    ...Object.entries(resultsByDisplayName),
  ];

  // Create annotations for each display name.
  return entries.map<AnnotationEntry>(([displayName, results]) => ({
    annotations: createAnnotations(results),
    displayName,
  }));
};
