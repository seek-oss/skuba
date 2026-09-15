import { inspect } from 'util';

import type {
  Reporter,
  SerializedError,
  TestModule,
  TestRunEndReason,
  Vitest,
} from 'vitest/node';

import { log } from '../../../../utils/logging.js';
import { throwOnTimeout } from '../../../../utils/wait.js';

import {
  type AnnotationEntry,
  generateAnnotationEntries,
} from './annotations.js';

import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

/**
 * Reports Vitest results to GitHub as a check run per project.
 *
 * Test failures are surfaced as annotations against the offending lines, which
 * appear in the **Checks** and **Files changed** tabs of a pull request.
 *
 * This is registered unconditionally by `Vitest.mergePreset` and does nothing
 * unless it is running in CI with a GitHub API token on the environment, so
 * local test runs are unaffected.
 */
export class GitHubReporter implements Pick<
  Reporter,
  'onInit' | 'onTestRunEnd'
> {
  private ctx: Vitest | undefined;

  onInit(ctx: Vitest): void {
    this.ctx = ctx;
  }

  async onTestRunEnd(
    testModules: readonly TestModule[],
    unhandledErrors: readonly SerializedError[],
    reason: TestRunEndReason,
  ): Promise<void> {
    const ctx = this.ctx;

    if (
      !GitHub.enabledFromEnvironment() ||
      !ctx ||
      // Watch mode reruns would each report their own check run.
      ctx.config.watch ||
      reason === 'interrupted'
    ) {
      return;
    }

    if (!(await Git.findRoot({ dir: process.cwd() }))) {
      log.warn(
        'GitHub annotations skipped because no .git directory was found.',
      );
      return;
    }

    type CheckRun = Parameters<typeof GitHub.createCheckRun>[0];

    let checkRuns: CheckRun[] | undefined;

    try {
      const entries = generateAnnotationEntries({
        ctx,
        testModules,
        unhandledErrors,
      });

      const build = GitHub.buildNameFromEnvironment();

      // Report a check run even when no modules ran so that the commit always
      // carries a `skuba/test` status.
      const fallbackEntry: AnnotationEntry = {
        annotations: [],
        projectName: undefined,
        ok: reason === 'passed',
      };

      // Create a check run per project.
      checkRuns = (entries.length ? entries : [fallbackEntry]).map(
        ({ annotations, ok, projectName }) => ({
          name: `skuba/test${projectName ? ` (${projectName})` : ''}`,
          annotations,
          conclusion: ok ? 'success' : 'failure',
          summary: ok
            ? '`skuba test` passed.'
            : '`skuba test` found issues that require triage.',
          title: `${build} ${ok ? 'passed' : 'failed'}`,
        }),
      );

      // `allSettled` rather than `all` so that one failed request cannot
      // leave another rejecting unhandled, which would crash the process.
      const results = await throwOnTimeout(
        Promise.allSettled(
          checkRuns.map((checkRun) => GitHub.createCheckRun(checkRun)),
        ),
        { s: 30 },
      );

      const errors = results.flatMap((result): unknown[] =>
        result.status === 'rejected' ? [result.reason] : [],
      );

      if (errors.length) {
        throw new AggregateError(errors, 'Failed to create check runs.');
      }
    } catch (err) {
      log.warn('Failed to report test results to GitHub.');
      log.subtle(inspect(err));

      if (checkRuns) {
        log.subtle('Requests:');
        log.subtle(JSON.stringify(checkRuns));
      }
    }
  }
}
