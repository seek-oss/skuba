import type { OxfmtOutput } from '../../../adapter/oxfmt.js';

import type * as GitHub from '@skuba-lib/api/github';

export const createOxfmtAnnotations = (
  oxfmt: OxfmtOutput,
): GitHub.Annotation[] =>
  oxfmt.result.errored.map((result) => {
    const message =
      result.err instanceof Error ? result.err.message : result.err;

    return {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      path: result.filepath,
      message:
        typeof message === 'string' || message instanceof Error
          ? String(message)
          : 'This file has not been formatted.',
      title: 'Oxfmt',
    };
  });
