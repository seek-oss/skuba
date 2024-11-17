import * as Buildkite from '../../../../api/buildkite';
import type { PrettierOutput } from '../../../adapter/prettier';

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
