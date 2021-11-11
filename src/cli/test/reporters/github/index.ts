import type { Context, Reporter } from '@jest/reporters';
import type { AggregatedResult, TestResult } from '@jest/test-result';

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

    // Create annotations for each display name
    const annotationResults = Object.entries(sortedTestResults).map<{
      displayName: string;
      annotations: GitHub.Annotation[];
    }>(([displayName, testResults]) => ({
      displayName,
      annotations: createAnnotations(testResults),
    }));

    // Create a check run per display name. Run in series.
    for (const { displayName, annotations } of annotationResults) {
      const name = `skuba/test${
        displayName !== DEFAULT_NAME ? ` (${displayName})` : ''
      }`;
      const isOk = Boolean(!annotations.length);
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
    }
  }
}
