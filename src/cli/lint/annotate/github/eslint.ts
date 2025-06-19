import type * as GitHub from '../../../../api/github/index.js';
import type { ESLintOutput } from '../../../adapter/eslint.js';

export const createEslintAnnotations = (
  eslint: ESLintOutput,
): GitHub.Annotation[] =>
  [...eslint.errors, ...eslint.warnings].flatMap<GitHub.Annotation>((result) =>
    result.messages.map((message): GitHub.Annotation => {
      // Annotations only support start_column and end_column on the same line.
      const isSameLine = message.line === message.endLine;
      const startColumn = isSameLine && message.column;
      const endColumn = (isSameLine && message.endColumn) || startColumn;

      return {
        annotation_level: message.severity === 2 ? 'failure' : 'warning',
        start_line: message.line ?? 1,
        end_line: message.endLine ?? message.line ?? 1,
        ...(startColumn && { start_column: startColumn }),
        ...(endColumn && { end_column: endColumn }),
        message: message.message,
        path: result.filePath,
        title: `ESLint${message.ruleId ? ` (${message.ruleId})` : ''}`,
      };
    }),
  );
