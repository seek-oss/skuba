import type * as GitHub from '../../../../api/github/index.js';
import type { InternalLintResult } from '../../internal.js';

export const createInternalAnnotations = (
  internal: InternalLintResult,
): GitHub.Annotation[] =>
  (internal.annotations ?? []).map((annotation) => ({
    annotation_level: 'failure',
    start_line: annotation.start_line ?? 1,
    end_line: annotation.end_line ?? annotation.start_line ?? 1,
    path: annotation.path,
    message: annotation.message,
    title: 'skuba lint',
  }));
