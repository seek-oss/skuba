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
   * This can be useful for executing in compute-constrained environments and
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
  tscOutputStream?: NodeJS.WritableStream;
}
