import { Github } from '../../../../';
import { PrettierOutput } from '../../../../cli/adapter/prettier';

const createPrettierAnnotations = (prettier: PrettierOutput) => {
  const annotations: Github.Annotation[] = [];
  if (!prettier.ok) {
    prettier.result.errored.forEach((result) => {
      annotations.push({
        annotation_level: 'failure',
        start_line: 0,
        end_line: 0,
        path: result.filepath,
        message: 'Prettier found an issue with this file',
      });
    });
  }

  return annotations;
};

export { createPrettierAnnotations };
