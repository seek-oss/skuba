import path from 'path';

import type { TestResult } from '@jest/test-result';

const jestRegex = /\((.+?):(\d+):(\d+)\)/;

import * as GitHub from '../../../../api/github';

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
          const match = jestRegex.exec(failureMessage);
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
