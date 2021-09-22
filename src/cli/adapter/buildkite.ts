import { inspect } from 'util';

import { exec } from '../../utils/exec';
import { log } from '../../utils/logging';

type AnnotationStyle = 'success' | 'info' | 'warning' | 'error';

interface AnnotationOptions {
  context: string;
  style: AnnotationStyle;
}

export const buildkiteIntegrationEnabled = (): boolean =>
  Boolean(
    process.env.BUILDKITE &&
      process.env.BUILDKITE_AGENT_ACCESS_TOKEN &&
      process.env.BUILDKITE_JOB_ID,
  );

/**
 * Asynchronously uploads a Buildkite annotation
 */
export const buildkiteAnnotate = (
  { context, style }: AnnotationOptions,
  markdown: string,
) => {
  if (!buildkiteIntegrationEnabled()) {
    return;
  }

  exec(
    'buildkite-agent',
    'annotate',
    '--context',
    context,
    '--style',
    style,
    markdown,
  ).catch((err) => log.warn(`Buildkite annotation failed: ${inspect(err)}`));
};
