import type { OxfmtResult } from '../../../adapter/oxfmt.js';

import * as Buildkite from '@skuba-lib/api/buildkite';

export const createOxfmtAnnotations = (oxfmt: OxfmtResult): string[] =>
  !oxfmt.ok
    ? [
        '**Oxfmt**',
        Buildkite.md.terminal(
          (oxfmt.errors ?? [])
            .map(({ path, message }) => `${path} ${message}`.trimEnd())
            .join('\n'),
        ),
      ]
    : [];
