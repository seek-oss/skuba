import * as Buildkite from '../../../../api/buildkite/index.js';
import type { InternalLintResult } from '../../internal.js';

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
