import path from 'path';

import { TestResult } from '@jest/test-result';

const jestRegex = /\((.+?):(\d+):(\d+)\)/;

import * as GitHub from '../../../../api/github';

const createAnnotations = (testResults: TestResult[]) => {
  const cwd = process.cwd();

  const annotations: GitHub.Annotation[] = [];
  testResults.forEach((testResult) => {
    if (testResult.testExecError) {
      annotations.push({
        annotation_level: 'failure',
        path: path.relative(cwd, testResult.testFilePath),
        start_line: 1,
        end_line: 1,
        message: testResult.testExecError.message,
        title: 'Jest',
      });
    }

    if (testResult.numFailingTests === 0) {
      return;
    }

    testResult.testResults.forEach((assertionResult) => {
      assertionResult.failureMessages.forEach((failureMessage) => {
        const match = jestRegex.exec(failureMessage);
        if (match?.length === 4) {
          annotations.push({
            annotation_level: 'failure',
            path: path.relative(cwd, match[1]),
            start_line: Number(match[2]),
            end_line: Number(match[2]),
            start_column: Number(match[3]),
            end_column: Number(match[3]),
            message: failureMessage,
            title: 'Jest',
          });
        }
      });
    });
  });

  return annotations;
};

export { createAnnotations };
