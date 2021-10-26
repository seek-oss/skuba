import { Linter } from 'eslint';

import * as GitHub from '../../../../api/github';
import { ESLintOutput, ESLintResult } from '../../../../cli/adapter/eslint';

const mapEslintResultToAnnotation = (
  result: ESLintResult,
  message: Linter.LintMessage,
): GitHub.Annotation => {
  // Annotations only support start_column and end_column on the same line.
  const column = message.line === message.endLine && message.column;
  const endColumn =
    message.line === message.endLine && (message.endColumn || column);
  return {
    annotation_level: message.severity === 2 ? 'failure' : 'warning',
    start_line: message.line,
    end_line: message.endLine || message.line,
    ...(column && { start_column: column }),
    ...(endColumn && { end_column: endColumn }),
    message: message.message,
    path: result.filePath,
    ...(message.ruleId && { title: message.ruleId }),
  };
};

const createEslintAnnotations = (eslint: ESLintOutput) => {
  const annotations: GitHub.Annotation[] = [];

  if (!eslint.ok) {
    eslint.errors.forEach((result) => {
      result.messages.forEach((message) => {
        annotations.push(mapEslintResultToAnnotation(result, message));
      });
    });
  }

  eslint.warnings.forEach((result) => {
    result.messages.forEach((message) => {
      annotations.push(mapEslintResultToAnnotation(result, message));
    });
  });
  return annotations;
};

export { createEslintAnnotations };
