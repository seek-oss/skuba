import type { Context, Reporter } from '@jest/reporters';
import type { AggregatedResult } from '@jest/test-result';
import stripAnsi from 'strip-ansi';

import * as Buildkite from '../../../../api/buildkite';
import * as GitHub from '../../../../api/github';
import {
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from '../../../../api/github/environment';
import { log } from '../../../../utils/logging';
import { renderCoverageText } from '../coverage';

import { generateAnnotationEntries } from './annotations';

export default class GitHubReporter implements Pick<Reporter, 'onRunComplete'> {
  async onRunComplete(
    _contexts: Set<Context>,
    { coverageMap, testResults }: AggregatedResult,
  ): Promise<void> {
    if (!enabledFromEnvironment()) {
      return;
    }

    try {
      const coverage = renderCoverageText(coverageMap);

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

        if (coverage) {
          const buildkiteOutput: string = [
            '`skuba test` coverage:',
            Buildkite.md.terminal(coverage),
          ].join('\n\n');

          await Buildkite.annotate(buildkiteOutput, {
            context: `skuba-test-${
              displayName ? `-${Buffer.from(displayName).toString('hex')}` : ''
            }`,
            scopeContextToStep: true,
            style: isOk ? 'success' : 'error',
          });
        }

        await GitHub.createCheckRun({
          name,
          annotations,
          conclusion: isOk ? 'success' : 'failure',
          summary,
          text: coverage
            ? Buildkite.md.terminal(stripAnsi(coverage))
            : undefined,
          title: `${build} ${isOk ? 'passed' : 'failed'}`,
        });
      }
    } catch (err) {
      log.warn('Failed to annotate results.');
      log.warn(err);
    }
  }
}
