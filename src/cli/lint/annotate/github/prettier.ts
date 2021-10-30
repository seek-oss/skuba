import * as GitHub from '../../../../api/github';
import { PrettierOutput } from '../../../../cli/adapter/prettier';

export const createPrettierAnnotations = (
  prettier: PrettierOutput,
): GitHub.Annotation[] => {
  const annotations: GitHub.Annotation[] = [];
  if (!prettier.ok) {
    prettier.result.errored.forEach((result) => {
      annotations.push({
        annotation_level: 'failure',
        start_line: 1,
        end_line: 1,
        path: result.filepath,
        message: 'There is an issue with this file',
        title: 'Prettier',
      });
    });
  }

  return annotations;
};
