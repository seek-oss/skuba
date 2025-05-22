import type Git from 'isomorphic-git' with { 'resolution-mode': 'import' };

import { currentBranch } from './currentBranch';

jest.mock('isomorphic-git');

const git = jest.requireMock<typeof Git>('isomorphic-git');

afterEach(jest.clearAllMocks);

describe('currentBranch', () => {
  const dir = process.cwd();

  it.each`
    description                | env
    ${'Buildkite'}             | ${{ BUILDKITE_BRANCH: 'x' }}
    ${'GitHub Actions branch'} | ${{ GITHUB_REF_NAME: 'x' }}
    ${'GitHub Actions PR'}     | ${{ GITHUB_HEAD_REF: 'x' }}
  `('returns a branch name from $description', async ({ env }) => {
    await expect(currentBranch({ env })).resolves.toBe('x');

    expect(git.currentBranch).not.toHaveBeenCalled();
  });

  it('returns a branch name from the Git repository', async () => {
    jest.mocked(git.currentBranch).mockResolvedValue('x');

    await expect(currentBranch({ dir, env: {} })).resolves.toBe('x');

    expect(git.currentBranch).toHaveBeenCalledTimes(1);
  });

  it('returns undefined with no environment variables nor dir', async () => {
    jest.mocked(git.currentBranch).mockResolvedValue(undefined);

    await expect(currentBranch({ env: {} })).resolves.toBeUndefined();

    expect(git.currentBranch).not.toHaveBeenCalled();
  });

  it('returns undefined with no environment variables and a detached head', async () => {
    jest.mocked(git.currentBranch).mockResolvedValue(undefined);

    await expect(currentBranch({ dir, env: {} })).resolves.toBeUndefined();

    expect(git.currentBranch).toHaveBeenCalledTimes(1);
  });
});
