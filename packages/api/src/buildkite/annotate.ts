import { exec, hasCommand } from '../../../../src/utils/exec.js';
import { log } from '../../../../src/utils/logging.js';

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

// Buildkite annotation currently only supports 1MiB of data
export const MAX_SIZE = 1024 * 1024; // 1MiB in bytes
export const TRUNCATION_WARNING = '... [Truncated due to size limit]';

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

  // Check if the annotation exceeds the maximum size
  let truncatedMarkdown = markdown;
  if (markdown.length > MAX_SIZE) {
    // Notify user of truncation, leave space for message
    const remainingSpace = MAX_SIZE - TRUNCATION_WARNING.length;
    truncatedMarkdown = markdown.slice(0, remainingSpace) + TRUNCATION_WARNING;
    // Log full message to the build log
    log.warn(`Annotation truncated, full message is: ${markdown}`);
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
    truncatedMarkdown,
  );
};
