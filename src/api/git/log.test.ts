import git from 'isomorphic-git';

import { getHeadCommitId } from './log';

jest.mock('isomorphic-git');

const dir = process.cwd();

afterEach(jest.resetAllMocks);

describe('getHeadCommitId', () => {
  it('prefers a commit ID from a Buildkite environment', async () => {
    await expect(
      getHeadCommitId({ dir, env: { BUILDKITE_COMMIT: 'b'.repeat(40) } }),
    ).resolves.toBe('b'.repeat(40));

    expect(git.log).not.toHaveBeenCalled();
  });

  it('prefers a commit ID from a GitHub Actions environment', async () => {
    await expect(
      getHeadCommitId({ dir, env: { GITHUB_SHA: 'c'.repeat(40) } }),
    ).resolves.toBe('c'.repeat(40));

    expect(git.log).not.toHaveBeenCalled();
  });

  it('falls back to a commit ID from the Git log', async () => {
    jest.mocked(git.log).mockResolvedValue([{ oid: 'a'.repeat(40) } as any]);

    await expect(getHeadCommitId({ dir, env: {} })).resolves.toBe(
      'a'.repeat(40),
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });

  it('throws on an empty Git log', async () => {
    jest.mocked(git.log).mockResolvedValue([]);

    await expect(
      getHeadCommitId({ dir, env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Git log does not contain any commits"`,
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });
});
