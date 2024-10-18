import { stripVTControlCharacters as stripAnsi } from 'util';

import type * as GitHub from '../../../../api/github';
import type { StreamInterceptor } from '../../../lint/external';

type TscLevel = 'error' | 'warning' | 'info';

/**
 * Matches the `tsc │` prefix on each `tsc` log.
 */

/**
 * Matches regular and pretty `tsc` output.
 *
 * For example, given the following input string:
 *
 * ```console
 * src/skuba.ts:43:7 - error TS2769: No overload matches this call.
 *   Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.
 *     Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.
 *   Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.
 *     Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.
 *       Type 'unknown' is not assignable to type 'string'.
 * ```
 *
 * This pattern will produce the following matches:
 *
 * 1. src/skuba.ts
 * 2. 43
 * 3. 7
 * 4. error
 * 5. 2769
 * 6. No overload matches this call [...] not assignable to type 'string'.
 */
const tscOutputRegex =
  /([^\s].*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*([\s\S]*?)(?=\n\S)(?=\n\D)/g;

const annotationLevelMap: Record<
  TscLevel,
  GitHub.Annotation['annotation_level']
> = {
  error: 'failure',
  warning: 'warning',
  info: 'notice',
};

export const createTscAnnotations = (
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): GitHub.Annotation[] => {
  if (tscOk) {
    return [];
  }

  const matches = stripAnsi(tscOutputStream.output()).matchAll(tscOutputRegex);
  return Array.from(matches).flatMap<GitHub.Annotation>((match) =>
    match?.length === 7 && match[1] && match[4] && match[5] && match[6]
      ? {
          annotation_level: annotationLevelMap[match[4] as TscLevel],
          path: match[1],
          start_line: Number(match[2]),
          end_line: Number(match[2]),
          start_column: Number(match[3]),
          end_column: Number(match[3]),
          message: match[6].trim(),
          title: `tsc (TS${match[5]})`,
        }
      : [],
  );
};
