import { exec } from '../../utils/exec';

export type AnnotationStyle = 'success' | 'info' | 'warning' | 'error';

interface AnnotationOptions {
  context?: string;
  style?: AnnotationStyle;
}

/**
 * Asynchronously uploads a Buildkite annotation.
 *
 * If the following environment variables are not present,
 * the function will silently return without attempting to annotate:
 *
 * - `BUILDKITE`
 * - `BUILDKITE_AGENT_ACCESS_TOKEN`
 * - `BUILDKITE_JOB_ID`
 * - `BUILDKITE_STEP_ID`
 *
 * The `buildkite-agent` binary must also be on your `PATH`.
 */
export const annotate = async (
  markdown: string,
  opts: AnnotationOptions = {},
): Promise<void> => {
  if (
    !(
      process.env.BUILDKITE &&
      process.env.BUILDKITE_AGENT_ACCESS_TOKEN &&
      process.env.BUILDKITE_JOB_ID &&
      process.env.BUILDKITE_STEP_ID
    )
  ) {
    return;
  }

  // Always scope to the current Buildkite step.
  const context = [process.env.BUILDKITE_STEP_ID, opts.context]
    .filter(Boolean)
    .join('-');

  const { style } = opts;

  await exec(
    'buildkite-agent',
    'annotate',
    ...(context ? ['--context', context] : []),
    ...(style ? ['--style', style] : []),
    markdown,
  );
};
