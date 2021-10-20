import { Annotation } from 'api/github/check-run';
import { PrettierOutput } from 'cli/adapter/prettier';

interface PrettierError {
  filePath: string;
}

const isPrettierError = (err: unknown | undefined): err is PrettierError =>
  Boolean((err as PrettierError)?.filePath);

const createPrettierAnnotations = (prettier: PrettierOutput) => {
  const annotations: Annotation[] = [];
  if (!prettier.ok) {
    prettier.result.errored.forEach((result) => {
      if (isPrettierError(result.err)) {
        annotations.push({
          annotation_level: 'failure',
          start_line: 0,
          end_line: 0,
          path: result.err.filePath,
          message: 'Prettier found an issue with this file',
        });
      }
    });
  }

  return annotations;
};

export { createPrettierAnnotations };
