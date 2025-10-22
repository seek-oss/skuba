import git from 'isomorphic-git';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getHeadCommitId, getHeadCommitMessage } from './log.js';

vi.mock('isomorphic-git');

const dir = process.cwd();

afterEach(vi.resetAllMocks);

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
    vi.mocked(git.log).mockResolvedValue([{ oid: 'a'.repeat(40) } as any]);

    await expect(getHeadCommitId({ dir, env: {} })).resolves.toBe(
      'a'.repeat(40),
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });

  it('throws on an empty Git log', async () => {
    vi.mocked(git.log).mockResolvedValue([]);

    await expect(
      getHeadCommitId({ dir, env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Git log does not contain any commits"`,
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });
});

describe('getHeadCommitMessage', () => {
  it('prefers a commit message from a Buildkite environment', async () => {
    await expect(
      getHeadCommitMessage({ dir, env: { BUILDKITE_MESSAGE: 'Do work' } }),
    ).resolves.toBe('Do work');

    expect(git.log).not.toHaveBeenCalled();
  });

  it('falls back to a commit ID from the Git log', async () => {
    vi.mocked(git.log).mockResolvedValue([
      { commit: { message: 'Do work' } } as any,
    ]);

    await expect(getHeadCommitMessage({ dir, env: {} })).resolves.toBe(
      'Do work',
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });

  it('throws on an empty Git log', async () => {
    vi.mocked(git.log).mockResolvedValue([]);

    await expect(
      getHeadCommitMessage({ dir, env: {} }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Git log does not contain any commits"`,
    );

    expect(git.log).toHaveBeenCalledTimes(1);
  });
});
