import { Buildkite } from '../../../..';
import { PrettierOutput } from '../../../../cli/adapter/prettier';

const createPrettierAnnotations = (prettier: PrettierOutput): string[] => {
  const annotations: string[] = [];
  if (!prettier.ok) {
    annotations.push(
      '**Prettier**',
      Buildkite.md.terminal(
        prettier.result.errored
          .map(({ err, filepath }) =>
            [filepath, ...(err ? [String(err)] : [])].join(' '),
          )
          .join('\n'),
      ),
    );
  }

  return annotations;
};

export { createPrettierAnnotations };
