import type { Writable } from 'stream';

export interface Input {
  /**
   * Whether to enable verbose debug logging.
   *
   * Defaults to `false`.
   */
  debug: boolean;

  /**
   * Whether to disable parallelism to run linting operations serially.
   *
   * This can be useful for executing in resource-constrained environments and
   * snapshotting deterministic output in tests.
   *
   * Defaults to `false`.
   */
  serial: boolean;

  /**
   * An override output stream that can be supplied to test `tsc` logging.
   *
   * Defaults to `process.stdout`.
   */
  tscOutputStream?: Writable;

  /**
   * Whether to allow usage of Node.js worker threads.
   *
   * This may be set to `false` when there is a worker thread incompatibility,
   * such as calling in from a TypeScript context in our Jest tests.
   *
   * Defaults to `true`.
   */
  workerThreads?: boolean;

  /**
   * An override to point to a specific ESLint config file.
   */
  eslintConfigFile?: string;

  /**
   * Additional CLI flags that are used for skuba's internal lints.
   */
  additionalFlags?: string[];
}
