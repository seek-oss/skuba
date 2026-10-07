import { describe, expect, it } from 'vitest';

import type { Choice } from './prompts.js';
import { seedProjectName } from './seedProjectName.js';

const serviceName: Choice = {
  name: 'serviceName',
  message: 'Service slug',
  initial: 'my-project',
};

const moduleName: Choice = {
  name: 'moduleName',
  message: 'Module name',
  initial: '@seek/my-first-module',
  validate: (value) =>
    /^@seek\/.+$/.test(value) || 'Must start with @seek/ scope',
};

const buildkiteQueue: Choice = {
  name: 'prodBuildkiteQueueName',
  message: 'Prod Buildkite queue',
  initial: 'my-team-aws-account-prod:cicd',
  validate: (value) => /^.+:.+$/.test(value),
};

describe('seedProjectName', () => {
  it('answers an unvalidated project name field', () =>
    expect(seedProjectName([serviceName], 'my-worker')).toEqual({
      fields: [],
      answers: { serviceName: 'my-worker' },
    }));

  it('answers a project name field that passes its own validation', () =>
    expect(seedProjectName([moduleName], '@seek/my-worker')).toEqual({
      fields: [],
      answers: { moduleName: '@seek/my-worker' },
    }));

  it('pre-fills a project name field that fails its own validation', () =>
    expect(seedProjectName([moduleName], 'my-worker')).toEqual({
      fields: [{ ...moduleName, initialValue: 'my-worker' }],
      answers: {},
    }));

  it('leaves unrelated fields to be prompted for', () =>
    expect(seedProjectName([serviceName, buildkiteQueue], 'my-worker')).toEqual(
      {
        fields: [buildkiteQueue],
        answers: { serviceName: 'my-worker' },
      },
    ));

  it('passes through a template that names nothing', () =>
    expect(seedProjectName([buildkiteQueue], 'my-worker')).toEqual({
      fields: [buildkiteQueue],
      answers: {},
    }));
});
