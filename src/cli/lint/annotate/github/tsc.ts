import stripAnsi from 'strip-ansi';

import * as GitHub from '../../../../api/github';
import { StreamInterceptor } from '../../../../cli/lint/external';

type TscLevel = 'error' | 'warning' | 'info';

/**
 * Matches the `tsc │` prefix on each `tsc` log.
 */
const tscPrefixRegex = new RegExp(/(tsc\s+│ )/, 'g');

/**
 * Matches regular and pretty tsc output
 * src/skuba.ts:43:7 - error TS2769: No overload matches this call.
  Overload 1 of 2, '(obj: LogContext, msg?: string | undefined, ...args: any[]): void', gave the following error.
    Argument of type 'unknown' is not assignable to parameter of type 'LogContext'.
  Overload 2 of 2, '(msg?: string | undefined, ...args: any[]): void', gave the following error.
    Argument of type 'unknown' is not assignable to parameter of type 'string | undefined'.
      Type 'unknown' is not assignable to type 'string'.
  1: src/skuba.ts
  2. 43
  3. 7
  4. error
  5. 2769
  6. No overload matches this call. until the very end.
 */
const tscOutputRegex = new RegExp(
  /([^\s]*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*([\s\S]*?)(?=\n\S)/,
  'g',
);

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
  const annotations: GitHub.Annotation[] = [];
  if (!tscOk) {
    const rawOutput = stripAnsi(tscOutputStream.output()).replace(
      tscPrefixRegex,
      '',
    );
    const matches = rawOutput.matchAll(tscOutputRegex);
    for (const match of matches) {
      if (match?.length === 7) {
        annotations.push({
          annotation_level: annotationLevelMap[match[4] as TscLevel],
          path: match[1],
          start_line: Number(match[2]),
          end_line: Number(match[2]),
          start_column: Number(match[3]),
          end_column: Number(match[3]),
          message: match[6].trim(),
          title: `tsc`,
        });
      }
    }
  }

  return annotations;
};
