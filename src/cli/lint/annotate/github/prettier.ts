import type * as GitHub from '../../../../api/github';
import type { PrettierOutput } from '../../../adapter/prettier';

export const createPrettierAnnotations = (
  prettier: PrettierOutput,
): GitHub.Annotation[] =>
  prettier.result.errored.map((result) => {
    const message =
      result.err instanceof Error ? result.err.message : result.err;

    return {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      path: result.filepath,
      message: message ? String(message) : 'This file has not been formatted.',
      title: 'Prettier',
    };
  });
