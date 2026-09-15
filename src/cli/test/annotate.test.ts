import { afterEach, expect, it, vi } from 'vitest';

import { createBuildkiteAnnotations } from './annotate.js';

import * as Buildkite from '@skuba-lib/api/buildkite';

vi.mock('@skuba-lib/api/buildkite');

afterEach(() => {
  vi.resetAllMocks();
});

it('annotates a failed test run', async () => {
  await createBuildkiteAnnotations(false);

  expect(Buildkite.annotate).toHaveBeenCalledWith(
    '`skuba test` found issues that require triage:',
    {
      context: 'skuba-test',
      scopeContextToStep: true,
      style: 'error',
    },
  );
});

it('returns immediately on a passing test run', async () => {
  await createBuildkiteAnnotations(true);

  expect(Buildkite.annotate).not.toHaveBeenCalled();
});
