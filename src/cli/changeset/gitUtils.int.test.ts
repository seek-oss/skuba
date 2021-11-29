import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import newGit from '../../../integration/git/new.json';

import { listTags, switchToMaybeExistingBranch } from './gitUtils';

jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON(newGit);
});

const dir = './';

describe('listTags', () => {
  it('should list tags in the local directory and return them', async () => {
    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author: { name: 'skuba' },
    });

    await git.tag({ fs, dir, ref: 'tag1' });

    const tags = await listTags(dir);
    expect(tags).toStrictEqual(['tag1']);
  });
});

describe('switchToMaybeExistingBranch', () => {
  const branchName = 'branch2';
  it('should try to create a branch with a name', async () => {
    await switchToMaybeExistingBranch(dir, branchName);

    const currentBranch = await git.currentBranch({ fs, dir });

    expect(branchName).toBe(currentBranch);
  });

  it('should delete the branch if the current branch already exists and create a new one with the same name', async () => {
    const initialCommit = await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author: { name: 'skuba' },
    });

    await git.branch({ fs, dir, ref: branchName, checkout: true });

    await git.commit({
      fs,
      dir,
      message: 'new commit',
      author: { name: 'skuba' },
    });

    await git.checkout({ fs, dir, ref: 'master' });

    await switchToMaybeExistingBranch(dir, branchName);

    const currentBranch = await git.currentBranch({ fs, dir });
    const commits = await git.log({ fs, dir });

    expect(branchName).toBe(currentBranch);
    expect(commits[0].oid).toBe(initialCommit);
  });
});
