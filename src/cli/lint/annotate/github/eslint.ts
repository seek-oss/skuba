import { Annotation } from 'api/github/check-run';
import { ESLintOutput, ESLintResult } from 'cli/adapter/eslint';
import { Linter } from 'eslint';

const mapEslintResultToAnnotation = (
  result: ESLintResult,
  message: Linter.LintMessage,
): Annotation => ({
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
  const annotateWarnings = false;
  const annotations: Annotation[] = [];

  if (!eslint.ok) {
    eslint.errors.forEach((result) => {
      result.messages.forEach((message) => {
        annotations.push(mapEslintResultToAnnotation(result, message));
      });
    });
  }

  if (annotateWarnings) {
    eslint.errors.forEach((result) => {
      result.messages.forEach((message) => {
        annotations.push(mapEslintResultToAnnotation(result, message));
      });
    });
  }
  return annotations;
};

export { createEslintAnnotations };
