import fs from 'fs-extra';
import git from 'isomorphic-git';

import { createBranch } from './createBranch';

jest.mock('isomorphic-git');

afterEach(jest.resetAllMocks);

describe('createBranch', () => {
  it('propagates props to isomorphic-git', async () => {
    jest.mocked(git.branch).mockResolvedValue();

    await expect(
      createBranch({
        dir: '/workdir/skuba',
        name: 'new-branch',
      }),
    ).resolves.toBeUndefined();

    expect(git.branch).toHaveBeenCalledWith({
      fs,
      dir: '/workdir/skuba',
      ref: 'new-branch',
      checkout: true,
    });
  });

  describe('clean is true', () => {
    it('should delete the branch and create a new one if the branch already exists', async () => {
      jest
        .mocked(git.branch)
        .mockRejectedValueOnce(new git.Errors.AlreadyExistsError('branch', ''));

      await expect(
        createBranch({
          dir: '/workdir/skuba',
          name: 'new-branch',
          clean: true,
        }),
      ).resolves.toBeUndefined();

      expect(git.deleteBranch).toBeCalledWith({
        fs,
        dir: '/workdir/skuba',
        ref: 'new-branch',
      });
      expect(git.branch).toBeCalledTimes(2);
    });
  });
});
