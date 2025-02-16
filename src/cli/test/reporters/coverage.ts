import type { AggregatedResult } from '@jest/test-result';
import istanbulReport from 'istanbul-lib-report';
import istanbulReports from 'istanbul-reports';

export const createWriteOverride = () => {
  const chunks: Uint8Array[] = [];

  const output = () => Buffer.concat(chunks).toString('utf8');

  const write = (
    buffer: Uint8Array | string,
    encodingOrCb?: BufferEncoding | ((err?: Error) => void),
    cb?: (err?: Error) => void,
  ) => {
    chunks.push(
      typeof buffer === 'string'
        ? Buffer.from(
            buffer,
            typeof encodingOrCb === 'string' ? encodingOrCb : undefined,
          )
        : buffer,
    );

    if (typeof encodingOrCb === 'function') {
      encodingOrCb();
    } else {
      cb?.();
    }

    return true;
  };

  return {
    output,
    write,
  };
};

/**
 * Renders out test coverage using the Istanbul `text` reporter.
 *
 * This is unfortunately hacky in a couple of ways;
 *
 * 1. Jest does not support custom coverage reporters (facebook/jest#9112), so
 *    we rely on the default `CoverageReporter` running before us and use the
 *   `coverageMap` that it places on the aggregated result state.
 *
 * 2. `istanbul-reports` does not support writing to a custom stream, so we need
 *    to temporarily override `process.stdout.write` 😱.
 *
 * {@link https://github.com/facebook/jest/blob/v27.3.1/packages/jest-reporters/src/CoverageReporter.ts#L103}
    //
 */
export const renderCoverageText = (
  coverageMap: AggregatedResult['coverageMap'],
) => {
  if (!coverageMap) {
    // Coverage was not stored on the aggregated result by `CoverageReporter`.
    // Maybe `collectCoverage` / `--coverage` was not specified.
    return;
  }

  const reportContext = istanbulReport.createContext({
    coverageMap,
  });

  const overrideWrite = createWriteOverride();

  const originalWrite = process.stdout.write.bind(this);
  process.stdout.write = overrideWrite.write;

  try {
    istanbulReports.create('text').execute(reportContext);
  } finally {
    process.stdout.write = originalWrite;
  }

  return overrideWrite.output();
};
