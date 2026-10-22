import { describe, expect, it } from 'vitest';

import {
  BASE_PROMPT_DEFAULTS,
  type Choice,
  templateFieldError,
} from './prompts.ts';
import { DEFAULT_RENOVATE_PRESET } from './types.ts';

describe('templateFieldError', () => {
  const queue: Choice = {
    name: 'prodBuildkiteQueueName',
    message: 'Prod Buildkite queue',
    initial: 'my-team-aws-account-prod:cicd',
    validate: (value) => /^.+:.+$/.test(value),
  };

  it('requires a value', () => {
    expect(templateFieldError(queue, undefined)).toBe('Required');
    expect(templateFieldError(queue, '')).toBe('Required');
  });

  it('describes a boolean validation failure with the field example', () => {
    expect(templateFieldError(queue, 'not-a-queue')).toBe(
      'Invalid Prod Buildkite queue (e.g. my-team-aws-account-prod:cicd)',
    );
  });

  it('omits the example when the field has none', () => {
    const choice: Choice = {
      name: 'region',
      message: 'Region',
      validate: () => false,
    };

    expect(templateFieldError(choice, 'nope')).toBe('Invalid Region');
  });

  it('uses the message returned by the validator', () => {
    const choice: Choice = {
      name: 'moduleName',
      message: 'Module name',
      initial: '@seek/my-first-module',
      validate: (value) =>
        /^@seek\/.+$/.test(value) || 'Must start with @seek/ scope',
    };

    expect(templateFieldError(choice, 'my-module')).toBe(
      'Must start with @seek/ scope',
    );
    expect(templateFieldError(choice, '@seek/my-module')).toBeUndefined();
  });

  it('accepts a field with no validator', () => {
    const choice: Choice = { name: 'description', message: 'Description' };

    expect(templateFieldError(choice, 'anything')).toBeUndefined();
  });
});

describe('BASE_PROMPT_DEFAULTS', () => {
  it('defaults the Renovate preset to Rynovate', () => {
    expect(BASE_PROMPT_DEFAULTS).toMatchObject({
      platformName: 'arm64',
      defaultBranch: 'main',
      renovatePreset: DEFAULT_RENOVATE_PRESET,
    });
  });
});
