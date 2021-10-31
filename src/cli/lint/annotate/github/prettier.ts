import * as GitHub from '../../../../api/github';
import { PrettierOutput } from '../../../../cli/adapter/prettier';

export const createPrettierAnnotations = (
  prettier: PrettierOutput,
): GitHub.Annotation[] =>
  prettier.result.errored.map((result) => ({
    annotation_level: 'failure',
    start_line: 1,
    end_line: 1,
    path: result.filepath,
    message: 'This file has not been formatted with Prettier',
    title: 'Prettier',
  }));
