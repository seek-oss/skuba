import * as GitHub from '../../../../api/github';
import { ESLintOutput } from '../../../../cli/adapter/eslint';

export const createEslintAnnotations = (eslint: ESLintOutput) => {
  const annotations: GitHub.Annotation[] = [];
  [...(!eslint.ok ? eslint.errors : []), ...eslint.warnings].forEach(
    (result) => {
      result.messages.forEach((message) => {
        // Annotations only support start_column and end_column on the same line.
        const column = message.line === message.endLine && message.column;
        const endColumn =
          message.line === message.endLine && (message.endColumn || column);

        annotations.push({
          annotation_level: message.severity === 2 ? 'failure' : 'warning',
          start_line: message.line || 1,
          end_line: message.endLine || message.line || 1,
          ...(column && { start_column: column }),
          ...(endColumn && { end_column: endColumn }),
          message: message.message,
          path: result.filePath,
          title: `Eslint${message.ruleId ? ` - ${message.ruleId}` : ''}`,
        });
      });
    },
  );

  return annotations;
};
