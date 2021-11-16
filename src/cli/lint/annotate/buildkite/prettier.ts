import * as Buildkite from '../../../../api/buildkite';
import type { PrettierOutput } from '../../../../cli/adapter/prettier';

export const createPrettierAnnotations = (prettier: PrettierOutput): string[] =>
  !prettier.ok
    ? [
        '**Prettier**',
        Buildkite.md.terminal(
          prettier.result.errored
            .map(({ err, filepath }) =>
              [filepath, ...(err ? [String(err)] : [])].join(' '),
            )
            .join('\n'),
        ),
      ]
    : [];
