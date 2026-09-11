import * as Buildkite from '@skuba-lib/api/buildkite';

import type { OxfmtResult } from '../../../adapter/oxfmt.js';

const annotationBody = (oxfmt: Extract<OxfmtResult, { ok: false }>): string =>
  (oxfmt.errors ?? [])
    .map(({ path, message }) => `${path} ${message}`.trimEnd())
    .join('\n');

export const createOxfmtAnnotations = (oxfmt: OxfmtResult): string[] =>
  !oxfmt.ok ? ['**Oxfmt**', Buildkite.md.terminal(annotationBody(oxfmt))] : [];
