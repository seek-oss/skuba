import git from 'isomorphic-git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOwnerAndRepo, getOwnerAndRepoFromUrl } from './remote.js';

vi.mock('isomorphic-git');

const dir = process.cwd();

afterEach(() => {
  vi.resetAllMocks();
});

describe('getOwnerAndRepoFromUrl', () => {
  it.each`
    description             | url                                                   | expected
    ${'SSH with .git'}      | ${'git@github.com:seek-oss/skuba.git'}                | ${{ owner: 'seek-oss', repo: 'skuba' }}
    ${'HTTPS with .git'}    | ${'https://github.com/seek-oss/skuba.git'}            | ${{ owner: 'seek-oss', repo: 'skuba' }}
    ${'HTTPS without .git'} | ${'https://github.com/seek-oss/skuba'}                | ${{ owner: 'seek-oss', repo: 'skuba' }}
    ${'owner/repo slug'}    | ${'seek-oss/skuba'}                                   | ${{ owner: 'seek-oss', repo: 'skuba' }}
    ${'trimmed whitespace'} | ${'  git@github.com:SEEK-Jobs/secret-codebase.git  '} | ${{ owner: 'SEEK-Jobs', repo: 'secret-codebase' }}
    ${'unrecognised'}       | ${'something-invalid'}                                | ${undefined}
  `('parses $description', ({ url, expected }) =>
    expect(getOwnerAndRepoFromUrl(url)).toStrictEqual(expected),
  );
});

describe('getOwnerAndRepo', () => {
  it.each`
    description                               | env
    ${'BUILDKITE_REPO'}                       | ${{ BUILDKITE_REPO: 'git@github.com:seek-oss/skuba.git' }}
    ${'BUILDKITE_REPO without a .git suffix'} | ${{ BUILDKITE_REPO: 'https://github.com/seek-oss/skuba' }}
    ${'GITHUB_REPOSITORY'}                    | ${{ GITHUB_REPOSITORY: 'seek-oss/skuba' }}
  `('short circuits on $description', async ({ env }) => {
    await expect(getOwnerAndRepo({ dir, env })).resolves.toStrictEqual({
      owner: 'seek-oss',
      repo: 'skuba',
    });

    expect(git.listRemotes).not.toHaveBeenCalled();
  });

  it('extracts an owner and repo from an HTTP GitHub remote', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'origin', url: 'git@github.com:seek-oss/skuba.git' },
    ]);

    await expect(
      getOwnerAndRepo({
        dir,
        env: {
          // These should be ignored.
          BUILDKITE_REPO: 'something-invalid',
          GITHUB_REPOSITORY: 'something-invalid',
        },
      }),
    ).resolves.toStrictEqual({
      owner: 'seek-oss',
      repo: 'skuba',
    });

    expect(git.listRemotes).toHaveBeenCalledTimes(1);
  });

  it('extracts an owner and repo from an SSH GitHub remote', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([
      {
        remote: 'origin',
        url: 'git@github.com:SEEK-Jobs/secret-codebase.git',
      },
    ]);

    await expect(getOwnerAndRepo({ dir, env: {} })).resolves.toStrictEqual({
      owner: 'SEEK-Jobs',
      repo: 'secret-codebase',
    });

    expect(git.listRemotes).toHaveBeenCalledTimes(1);
  });

  it('throws on zero remotes', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([]);

    await expect(
      getOwnerAndRepo({ dir, env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Could not find a GitHub remote]`,
    );

    expect(git.listRemotes).toHaveBeenCalledTimes(1);
  });

  it('throws on unrecognised remotes', async () => {
    vi.mocked(git.listRemotes).mockResolvedValue([
      { remote: 'public', url: 'git@gitlab.com:seek-oss/skuba.git' },
      {
        remote: 'private',
        url: 'https://gitlab.com/SEEK-Jobs/secret-codebase.git',
      },
    ]);

    await expect(
      getOwnerAndRepo({ dir, env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `[Error: Could not find a GitHub remote]`,
    );

    expect(git.listRemotes).toHaveBeenCalledTimes(1);
  });
});
