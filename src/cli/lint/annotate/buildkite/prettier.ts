import * as Buildkite from '../../../../api/buildkite/index.js';
import type { PrettierOutput } from '../../../adapter/prettier.js';

export const createPrettierAnnotations = (
  prettier: PrettierOutput,
): string[] =>
  !prettier.ok
    ? [
        '**Prettier**',
        Buildkite.md.terminal(
          prettier.result.errored
            .map(({ err, filepath }) =>
              [
                filepath,
                ...(typeof err === 'string' || err instanceof Error
                  ? [String(err)]
                  : []),
              ].join(' '),
            )
            .join('\n'),
        ),
      ]
    : [];
