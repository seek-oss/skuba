import * as GitHub from '../../../../api/github';
import { StreamInterceptor } from '../../../../cli/lint/external';

const ansiPattern = [
  '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
  '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))',
].join('|');
const ansiRegex = new RegExp(ansiPattern, 'g');

const tscOutputRegex = new RegExp(
  /([^\s]*)[\(:](\d+)[,:](\d+)(?:\):\s+|\s+-\s+)(error|warning|info)\s+TS(\d+)\s*:\s*(.*)/,
);

type tscLevels = 'error' | 'warning' | 'info';

const annotationLevelMap: Record<
  tscLevels,
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
    const lines = tscOutputStream.output().split('\n').filter(Boolean);
    lines.forEach((line) => {
      const plainLine = line.replace(ansiRegex, '');
      const matches = tscOutputRegex.exec(plainLine);
      if (matches?.length === 7) {
        annotations.push({
          annotation_level: annotationLevelMap[matches[4] as tscLevels],
          path: matches[1],
          start_line: Number(matches[2]),
          end_line: Number(matches[2]),
          start_column: Number(matches[3]),
          end_column: Number(matches[3]),
          message: matches[6],
          title: `tsc`,
        });
      }
    });
  }

  return annotations;
};
