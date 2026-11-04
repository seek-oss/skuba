import { describe, expect, it } from 'vitest';

import { getFileUrl, getFileUrlFromEnvironment } from './fileUrl.js';

const remoteTsPath = 'packages/api/src/git/remote.ts';
const repoUrl = 'https://github.com/seek-oss/skuba';
const buildkiteRepo = 'git@github.com:seek-oss/skuba.git';

const remoteTsDiffAnchor =
  'diff-d059b5c4583b094489ecd4d58b0594533030847d3da0a24650a127cd6bf7c760';

const blobUrl = (commit: string, path: string, lines: string) =>
  `${repoUrl}/blob/${commit}/${path}#${lines}`;

const pullRequestUrl = (pullRequestNumber: number, lines: string) =>
  `${repoUrl}/pull/${pullRequestNumber}/files#${remoteTsDiffAnchor}${lines}`;

describe('getFileUrl', () => {
  it.each`
    description                                               | path                | startLine | endLine      | commit       | pullRequestNumber | expected
    ${'a line at the commit'}                                 | ${remoteTsPath}     | ${4}      | ${undefined} | ${'abc123'}  | ${undefined}      | ${blobUrl('abc123', remoteTsPath, 'L4')}
    ${'a line range at the commit'}                           | ${remoteTsPath}     | ${4}      | ${6}         | ${'abc123'}  | ${undefined}      | ${blobUrl('abc123', remoteTsPath, 'L4-L6')}
    ${'encoded path segments in a blob URL'}                  | ${'docs/a file.md'} | ${1}      | ${undefined} | ${'abc123'}  | ${undefined}      | ${blobUrl('abc123', 'docs/a%20file.md', 'L1')}
    ${'undefined when the commit is missing'}                 | ${remoteTsPath}     | ${4}      | ${undefined} | ${undefined} | ${undefined}      | ${undefined}
    ${'a line range in the pull request diff'}                | ${remoteTsPath}     | ${4}      | ${6}         | ${undefined} | ${42}             | ${pullRequestUrl(42, 'R4-R6')}
    ${'the pull request diff when a commit is also provided'} | ${remoteTsPath}     | ${4}      | ${undefined} | ${'abc123'}  | ${42}             | ${pullRequestUrl(42, 'R4')}
  `(
    'returns $description',
    ({ path, startLine, endLine, commit, pullRequestNumber, expected }) =>
      expect(
        getFileUrl({
          owner: 'seek-oss',
          repo: 'skuba',
          path,
          startLine,
          endLine,
          commit,
          pullRequestNumber,
        }),
      ).toBe(expected),
  );
});

describe('getFileUrlFromEnvironment', () => {
  it.each`
    description                                             | env                                                                                                | startLine | endLine      | pullRequestNumber | expected
    ${'a line from a Buildkite SSH checkout'}               | ${{ BUILDKITE_REPO: buildkiteRepo, BUILDKITE_COMMIT: 'abc123' }}                                   | ${4}      | ${undefined} | ${undefined}      | ${blobUrl('abc123', remoteTsPath, 'L4')}
    ${'a line from a GitHub Actions environment'}           | ${{ GITHUB_REPOSITORY: 'seek-oss/skuba', GITHUB_SHA: 'def456' }}                                   | ${20}     | ${undefined} | ${undefined}      | ${blobUrl('def456', remoteTsPath, 'L20')}
    ${'undefined when the repository is missing'}           | ${{ BUILDKITE_COMMIT: 'abc123' }}                                                                  | ${4}      | ${undefined} | ${undefined}      | ${undefined}
    ${'undefined when the commit is missing'}               | ${{ BUILDKITE_REPO: buildkiteRepo }}                                                               | ${4}      | ${undefined} | ${undefined}      | ${undefined}
    ${'a pull request diff without a commit'}               | ${{ BUILDKITE_REPO: buildkiteRepo }}                                                               | ${4}      | ${6}         | ${42}             | ${pullRequestUrl(42, 'R4-R6')}
    ${'a Buildkite pull request from the environment'}      | ${{ BUILDKITE_REPO: buildkiteRepo, BUILDKITE_PULL_REQUEST: '42' }}                                 | ${4}      | ${6}         | ${undefined}      | ${pullRequestUrl(42, 'R4-R6')}
    ${'a GitHub Actions pull request from the environment'} | ${{ GITHUB_REPOSITORY: 'seek-oss/skuba', GITHUB_REF: 'refs/pull/42/merge', GITHUB_SHA: 'def456' }} | ${4}      | ${undefined} | ${undefined}      | ${pullRequestUrl(42, 'R4')}
    ${'a blob URL when BUILDKITE_PULL_REQUEST is false'}    | ${{ BUILDKITE_REPO: buildkiteRepo, BUILDKITE_COMMIT: 'abc123', BUILDKITE_PULL_REQUEST: 'false' }}  | ${4}      | ${undefined} | ${undefined}      | ${blobUrl('abc123', remoteTsPath, 'L4')}
  `(
    'returns $description',
    ({ env, startLine, endLine, pullRequestNumber, expected }) =>
      expect(
        getFileUrlFromEnvironment({
          path: remoteTsPath,
          startLine,
          endLine,
          pullRequestNumber,
          env,
        }),
      ).toBe(expected),
  );
});
