import { expect, it } from 'vitest';
import { type ViteUserConfig, configDefaults } from 'vitest/config';

import { GitHubReporter } from './reporters/github/index.js';

import { mergePreset } from './index.js';

it('concatenates array options', () => {
  const config = mergePreset({
    test: { coverage: { exclude: ['src/testing'] } },
  });

  expect(config.test?.coverage).toMatchObject({
    exclude: expect.arrayContaining(['**/lib/**', 'src/testing']),
  });
});

it("registers the GitHub reporter alongside Vitest's defaults", () => {
  const config: ViteUserConfig = mergePreset({ test: {} });

  expect(config.test?.reporters).toEqual([
    ...configDefaults.reporters,
    expect.any(GitHubReporter),
  ]);
});

it('concatenates configured reporters', () => {
  const config = mergePreset({ test: { reporters: ['verbose'] } });

  expect(config.test?.reporters).toEqual([
    ...configDefaults.reporters,
    expect.any(GitHubReporter),
    'verbose',
  ]);
});

it('drops the GitHub reporter for a reporter configured in string form', () => {
  const config = mergePreset({ test: { reporters: 'dot' } });

  expect(config.test?.reporters).toBe('dot');
});
