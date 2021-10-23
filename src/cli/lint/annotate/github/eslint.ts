import { Linter } from 'eslint';

import { GitHub } from '../../../../';
import { ESLintOutput, ESLintResult } from '../../../../cli/adapter/eslint';

const mapEslintResultToAnnotation = (
  result: ESLintResult,
  message: Linter.LintMessage,
): GitHub.Annotation => ({
  annotation_level: message.severity === 2 ? 'failure' : 'warning',
  start_line: message.line,
  start_column: message.column,
  end_line: message.endLine || message.line,
  end_column: message.endColumn || message.column,
  message: message.message,
  path: result.filePath,
  ...(message.ruleId && { title: message.ruleId }),
});

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
