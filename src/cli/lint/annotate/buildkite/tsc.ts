import * as Buildkite from '../../../../api/buildkite';
import { StreamInterceptor } from '../../../../cli/lint/external';

export const createTscAnnotations = (
  tscOk: boolean,
  tscOutputStream: StreamInterceptor,
): string[] =>
  !tscOk
    ? [
        '**tsc**',
        Buildkite.md.terminal(
          tscOutputStream
            .output()
            .split('\n')
            .filter(Boolean)
            .filter((line) => !line.startsWith('TSFILE: '))
            .join('\n')
            .trim(),
        ),
      ]
    : [];
