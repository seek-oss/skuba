import { Context, Reporter } from '@jest/reporters';
import { AggregatedResult, TestResult } from '@jest/test-result';
import pMap from 'p-map';

import * as GitHub from '../../../../api/github';
import {
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from '../../../../api/github/environment';

import { createAnnotations } from './annotations';

const DEFAULT_NAME = 'noDisplayName';

export default class GitHubReporter implements Pick<Reporter, 'onRunComplete'> {
  async onRunComplete(
    _contexts: Set<Context>,
    results: AggregatedResult,
  ): Promise<void> {
    if (!enabledFromEnvironment()) {
      return;
    }

    // Sort tests by display name
    const sortedTestResults: Record<string, TestResult[]> = {};
    results.testResults.forEach((testResult) => {
      const displayName = testResult.displayName?.name ?? DEFAULT_NAME;
      sortedTestResults[displayName] ??= [];
      sortedTestResults[displayName].push(testResult);
    });

    // Create annotations for each display name group
    const annotationResults: Record<string, GitHub.Annotation[]> = {};
    Object.entries(sortedTestResults).forEach(([displayName, testResults]) => {
      const annotations = createAnnotations(testResults);
      annotationResults[displayName] = annotations;
    });

    // Create a check run per display name. Run in series.
    await pMap(
      Object.entries(annotationResults),
      async ([displayName, annotations]) => {
        const name = `skuba/test${
          displayName !== DEFAULT_NAME ? ` (${displayName})` : ''
        }`;
        const isOk = Boolean(annotations.length);
        const conclusion = isOk ? 'success' : 'failure';
        const summary = isOk
          ? '`skuba test` passed.'
          : '`skuba test` found issues that require triage.';
        const build = buildNameFromEnvironment();

        await GitHub.createCheckRun({
          name,
          annotations,
          conclusion,
          summary,
          title: `${build} ${isOk ? 'passed' : 'failed'}`,
        });
      },
      { concurrency: 1 },
    );
  }
}
