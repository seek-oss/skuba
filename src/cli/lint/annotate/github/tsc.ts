import * as GitHub from '../../../../api/github';
import { StreamInterceptor } from '../../../../cli/lint/external';

// Regex for typescript output lines. eg.
// "\x1B[34mtsc      │\x1B[39m src/index.ts(1,2): error TS6133: 'missing' is declared but its value is never read."
// Pulls out
// group 1: src/index.ts
// group 2: 1
// group 3: 2
// group 4: TS6133: 'missing' is declared but its value is never read.
const tscOutputRegex = new RegExp(/([^\s]*)\(([0-9]+),([0-9]+)\): error (.*)/);

export const createTscAnnotations = (
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): GitHub.Annotation[] => {
  const annotations: GitHub.Annotation[] = [];
  if (!tscOk) {
    const lines = tscOutputStream.output().split('\n').filter(Boolean);
    lines.forEach((line) => {
      const matches = tscOutputRegex.exec(line);
      if (matches?.length === 5) {
        annotations.push({
          annotation_level: 'failure',
          path: matches[1],
          start_line: Number(matches[2]),
          end_line: Number(matches[2]),
          start_column: Number(matches[3]),
          end_column: Number(matches[3]),
          message: matches[4],
          title: 'tsc',
        });
      }
    });
  }

  return annotations;
};
