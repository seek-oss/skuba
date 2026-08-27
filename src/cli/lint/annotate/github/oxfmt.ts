import type { OxfmtResult } from '../../../adapter/oxfmt.js';

import type * as GitHub from '@skuba-lib/api/github';

export const createOxfmtAnnotations = (
  oxfmt: OxfmtResult,
): GitHub.Annotation[] => {
  if (oxfmt.ok || !oxfmt.errors) {
    return [];
  }

  return oxfmt.errors.map((error) => {
    const startLine = error.position?.line ?? 1;
    const startColumn = error.position?.column;

    return {
      annotation_level: 'failure',
      start_line: startLine,
      end_line: startLine,
      ...(startColumn && {
        start_column: startColumn,
        end_column: startColumn,
      }),
      path: error.path,
      message: error.message,
      title: 'Oxfmt',
    };
  });
};
