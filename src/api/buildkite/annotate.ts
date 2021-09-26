import { exec, hasCommand } from '../../utils/exec';

export type AnnotationStyle = 'success' | 'info' | 'warning' | 'error';

const isAnnotationEnabled = async () =>
  Boolean(
    process.env.BUILDKITE &&
      process.env.BUILDKITE_AGENT_ACCESS_TOKEN &&
      process.env.BUILDKITE_JOB_ID &&
      (await hasCommand('buildkite-agent')),
  );

interface AnnotationOptions {
  context?: string;

  /**
   * Scopes an annotation's context to the Buildkite step ID.
   *
   * This lets you emit distinct annotations per step, and only takes effect if
   * the `BUILDKITE_STEP_ID` environment variable is present.
   */
  scopeContextToStep?: boolean;

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
 *
 * The `buildkite-agent` binary must also be on your `PATH`.
 */
export const annotate = async (
  markdown: string,
  opts: AnnotationOptions = {},
): Promise<void> => {
  if (!(await isAnnotationEnabled())) {
    return;
  }

  // Always scope to the current Buildkite step.
  const context = [
    opts.scopeContextToStep && process.env.BUILDKITE_STEP_ID,
    opts.context,
  ]
    .filter(Boolean)
    .join('|');

  const { style } = opts;

  await exec(
    'buildkite-agent',
    'annotate',
    ...(context ? ['--context', context] : []),
    ...(style ? ['--style', style] : []),
    markdown,
  );
};
