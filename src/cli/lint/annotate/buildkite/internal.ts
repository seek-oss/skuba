import * as Buildkite from '../../../../api/buildkite';
import type { InternalLintResult } from '../../internal';

export const createInternalAnnotations = (
  internal: InternalLintResult,
): string[] =>
  !internal.ok && internal.annotations?.length
    ? [
        '**skuba**',
        Buildkite.md.terminal(
          internal.annotations
            .map(({ message, path }) => `${path} ${message}`)
            .join('\n'),
        ),
      ]
    : [];
