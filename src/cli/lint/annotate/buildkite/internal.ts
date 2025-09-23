import type { InternalLintResult } from '../../internal.js';

import { Buildkite } from '@skuba-lib/api';

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
