import { Buildkite } from '../../../..';
import { StreamInterceptor } from '../../../../cli/lint/external';

const createTscAnnotations = (
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): string[] => {
  const annotations: string[] = [];
  if (!tscOk) {
    annotations.push(
      '**tsc**',
      Buildkite.md.terminal(
        tscOutputStream
          .output()
          .split('\n')
          .filter(Boolean)
          .map((line) => line.replace(/^tsc\s+│ /, ''))
          .filter((line) => !line.startsWith('TSFILE: '))
          .join('\n')
          .trim(),
      ),
    );
  }

  return annotations;
};

export { createTscAnnotations };
