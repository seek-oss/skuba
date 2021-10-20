import { Annotation } from 'api/github/check-run';
import { StreamInterceptor } from 'cli/lint/external';

const tscOutputRegex = new RegExp(/^(.*)\(([0-9]+),([0-9]+)\): error (.*)/);

const createTscAnnotations = (
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
) => {
  const annotations: Annotation[] = [];
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
        });
      }
    });
  }

  return annotations;
};

export { createTscAnnotations };
