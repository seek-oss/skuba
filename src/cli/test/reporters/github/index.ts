import { inspect } from 'util';

import type { Context, Reporter } from '@jest/reporters';
import type { AggregatedResult } from '@jest/test-result';

import * as GitHub from '../../../../api/github';
import {
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from '../../../../api/github/environment';
import { log } from '../../../../utils/logging';
import { throwOnTimeout } from '../../../../utils/wait';

import { generateAnnotationEntries } from './annotations';

export default class GitHubReporter implements Pick<Reporter, 'onRunComplete'> {
  async onRunComplete(
    _contexts: Set<Context>,
    { testResults }: AggregatedResult,
  ): Promise<void> {
    if (!enabledFromEnvironment()) {
      return;
    }

    type CheckRun = Parameters<typeof GitHub.createCheckRun>[0];

    let lastCheckRun: CheckRun | undefined;

    try {
      const entries = generateAnnotationEntries(testResults);

      const build = buildNameFromEnvironment();

      // Create a check run per display name.
      // Run in series to reduce the likelihood of exceeding GitHub rate limits.
      for (const { displayName, annotations } of entries) {
        const name = `skuba/test${displayName ? ` (${displayName})` : ''}`;

        const isOk = !annotations.length;

        const summary = isOk
          ? '`skuba test` passed.'
          : '`skuba test` found issues that require triage.';

        const checkRun: CheckRun = {
          name,
          annotations,
          conclusion: isOk ? 'success' : 'failure',
          summary,
          title: `${build} ${isOk ? 'passed' : 'failed'}`,
        };

        lastCheckRun = checkRun;

        await throwOnTimeout(GitHub.createCheckRun(checkRun), {
          s: 30,
        });
      }
    } catch (err) {
      log.warn('Failed to report test results to GitHub.');
      log.subtle(inspect(err));

      if (lastCheckRun) {
        log.subtle('Last request:');
        log.subtle(JSON.stringify(lastCheckRun));
      }
    }
  }
}
