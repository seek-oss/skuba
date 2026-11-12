import { describe, expect, it } from 'vitest';

import { getJobUrl } from './jobUrl.js';

const buildUrl = 'https://buildkite.com/org/pipeline/builds/1';

describe('getJobUrl', () => {
  it.each`
    description                          | env                                                             | expected
    ${'no build URL'}                    | ${{ BUILDKITE_JOB_ID: 'job-1' }}                                | ${undefined}
    ${'a build URL without a job id'}    | ${{ BUILDKITE_BUILD_URL: buildUrl }}                            | ${buildUrl}
    ${'a build URL anchored to the job'} | ${{ BUILDKITE_BUILD_URL: buildUrl, BUILDKITE_JOB_ID: 'job-1' }} | ${`${buildUrl}#job-1`}
  `('returns the job URL from $description', ({ env, expected }) =>
    expect(getJobUrl(env)).toBe(expected),
  );
});
