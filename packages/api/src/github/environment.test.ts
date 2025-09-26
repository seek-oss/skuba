import {
  apiTokenFromEnvironment,
  buildNameFromEnvironment,
  enabledFromEnvironment,
} from './environment.js';

describe('buildNameFromEnvironment', () => {
  it.each`
    description                 | env                                                          | expected
    ${'Buildkite'}              | ${{ BUILDKITE_BUILD_NUMBER: '123' }}                         | ${'Build #123'}
    ${'partial GitHub Actions'} | ${{ GITHUB_RUN_NUMBER: '456' }}                              | ${'Build #456'}
    ${'full GitHub Actions'}    | ${{ GITHUB_RUN_NUMBER: '789', GITHUB_WORKFLOW: 'Validate' }} | ${'Validate #789'}
    ${'default'}                | ${{}}                                                        | ${'Build'}
  `('returns "$expected" from $description environment', ({ env, expected }) =>
    expect(buildNameFromEnvironment(env)).toBe(expected),
  );
});

describe('enabledFromEnvironment', () => {
  it.each`
    description         | env
    ${'Buildkite'}      | ${{ BUILDKITE: 'x', GITHUB_API_TOKEN: 'x' }}
    ${'GitHub Actions'} | ${{ GITHUB_ACTIONS: 'x', GITHUB_TOKEN: 'x' }}
    ${'generic CI'}     | ${{ CI: 'x', GITHUB_TOKEN: 'x' }}
  `('accepts $description environment', ({ env }) =>
    expect(enabledFromEnvironment(env)).toBe(true),
  );

  it.each`
    description                                     | env
    ${'Buildkite environment without token'}        | ${{ BUILDKITE: 'x' }}
    ${'GitHub Actions environment without CI flag'} | ${{ GITHUB_TOKEN: 'x' }}
    ${'empty environment'}                          | ${{}}
  `('rejects $description', ({ env }) =>
    expect(enabledFromEnvironment(env)).toBe(false),
  );
});

describe('apiTokenFromEnvironment', () => {
  it.each`
    description         | env
    ${'Buildkite'}      | ${{ GITHUB_API_TOKEN: 'x' }}
    ${'GitHub Actions'} | ${{ GITHUB_TOKEN: 'x' }}
    ${'generic CI'}     | ${{ GITHUB_TOKEN: 'x' }}
  `('returns an API token from $description', ({ env }) =>
    expect(apiTokenFromEnvironment(env)).toBe('x'),
  );

  it('returns undefined when environment variables are not present', () =>
    expect(apiTokenFromEnvironment({})).toBeUndefined());
});
