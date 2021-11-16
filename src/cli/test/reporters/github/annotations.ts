import path from 'path';

import type { TestResult } from '@jest/test-result';

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
 * This pattern will produce the following matches:
 *
 * 1. /workdir/skuba/src/test.test.ts
 * 2. 2
 * 2. 15
 */
const JEST_LOCATION_REGEX = /\((.+?):(\d+):(\d+)\)/;

import type * as GitHub from '../../../../api/github';

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
        message: testResult.testExecError.message,
        title: 'Jest',
      };
    }

    if (testResult.numFailingTests > 0) {
      return testResult.testResults.flatMap((assertionResult) =>
        assertionResult.failureMessages.flatMap((failureMessage) => {
          const match = JEST_LOCATION_REGEX.exec(failureMessage);
          if (match?.length === 4) {
            return {
              annotation_level: 'failure',
              path: path.relative(cwd, match[1]),
              start_line: Number(match[2]),
              end_line: Number(match[2]),
              start_column: Number(match[3]),
              end_column: Number(match[3]),
              message: failureMessage,
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
