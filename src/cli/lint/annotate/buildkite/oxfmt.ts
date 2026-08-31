import type { OxfmtResult } from '../../../adapter/oxfmt.js';

import * as Buildkite from '@skuba-lib/api/buildkite';

const annotationBody = (oxfmt: Extract<OxfmtResult, { ok: false }>): string => {
  const output = oxfmt.output?.trim();
  if (output) {
    return output;
  }

  return (oxfmt.errors ?? [])
    .map(({ path, message }) => `${path} ${message}`.trimEnd())
    .join('\n');
};

export const createOxfmtAnnotations = (oxfmt: OxfmtResult): string[] =>
  !oxfmt.ok ? ['**Oxfmt**', Buildkite.md.terminal(annotationBody(oxfmt))] : [];
