import type { InternalLintResult } from '../../internal.js';

import * as Buildkite from '@skuba-lib/api/buildkite';
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
