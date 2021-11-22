import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import basicGit from '../../integration/git/basic.json';

import { getChangedFiles, gitCommitAll, gitReset } from './git';

jest.mock('fs-extra', () => memfs);

const author = { name: 'user', email: 'user@email.com' };
const dir = './';
const newFileName = 'newFile';

beforeEach(() => {
  vol.reset();
  vol.fromJSON(basicGit);
});

describe('gitReset', () => {
  describe('soft', () => {
    it('should keep the file added in another commit in the working directory', async () => {
      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      await fs.promises.writeFile(newFileName, '');
      await git.add({ fs, dir, filepath: newFileName });
      await git.commit({
        fs,
        dir,
        message: 'new commit',
        author,
      });

      await gitReset({ dir, branch: 'master', commitOid: initialCommit });

      const commits = await git.log({
        fs,
        dir,
        depth: 1,
      });

      const directory = await fs.promises.readdir(dir);

      expect(commits[0].oid).toEqual(initialCommit);
      expect(directory).toContain(newFileName);
    });
  });

  describe('hard', () => {
    it('should remove the file added in another commit from the working directory', async () => {
      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      await fs.promises.writeFile(newFileName, '');
      await git.add({ fs, dir, filepath: newFileName });
      await git.commit({
        fs,
        dir,
        message: 'new commit',
        author,
      });

      await gitReset({
        dir,
        branch: 'master',
        commitOid: initialCommit,
        hard: true,
      });

      const commits = await git.log({
        fs,
        dir,
        depth: 1,
      });

      const directory = await fs.promises.readdir(dir);

      expect(commits[0].oid).toEqual(initialCommit);
      expect(directory).not.toContain(newFileName);
    });

    it('should keep new files which are not committed in the working directory', async () => {
      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      await fs.promises.writeFile(newFileName, '');

      await gitReset({
        dir,
        branch: 'master',
        commitOid: initialCommit,
        hard: true,
      });

      const commits = await git.log({
        fs,
        dir,
        depth: 1,
      });

      const directory = await fs.promises.readdir(dir);

      expect(commits[0].oid).toEqual(initialCommit);
      expect(directory).toContain(newFileName);
    });

    it('should remove files which are staged', async () => {
      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      await fs.promises.writeFile(newFileName, '');
      await git.add({ fs, dir, filepath: newFileName });

      await gitReset({
        dir,
        branch: 'master',
        commitOid: initialCommit,
        hard: true,
      });

      const commits = await git.log({
        fs,
        dir,
        depth: 1,
      });

      const directory = await fs.promises.readdir(dir);

      expect(commits[0].oid).toEqual(initialCommit);
      expect(directory).not.toContain(newFileName);
    });

    it('should revert files which were modified', async () => {
      await fs.promises.writeFile(newFileName, 'hello');
      await git.add({ fs, dir, filepath: newFileName });
      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      await fs.promises.writeFile(newFileName, 'hello world');
      await git.add({ fs, dir, filepath: newFileName });
      await git.commit({
        fs,
        dir,
        message: 'new commit',
        author,
      });

      await gitReset({
        dir,
        branch: 'master',
        commitOid: initialCommit,
        hard: true,
      });

      const commits = await git.log({
        fs,
        dir,
        depth: 1,
      });

      const file = await fs.promises.readFile(newFileName);

      expect(commits[0].oid).toEqual(initialCommit);
      expect(Buffer.from(file).toString()).toBe('hello');
    });
  });
});

describe('getChangedFiles', () => {
  it('should return files which were added to the workdir', async () => {
    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await fs.promises.writeFile(newFileName, '');
    const files = await getChangedFiles({ dir });

    expect(files).toStrictEqual([{ path: newFileName, deleted: false }]);
  });

  it('should return files which were modified', async () => {
    await fs.promises.writeFile(newFileName, '');
    await git.add({ fs, dir, filepath: newFileName });
    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await fs.promises.writeFile(newFileName, 'hello world');
    const files = await getChangedFiles({ dir });

    expect(files).toStrictEqual([{ path: newFileName, deleted: false }]);
  });

  it('should return files which were deleted', async () => {
    await fs.promises.writeFile(newFileName, '');
    await git.add({ fs, dir, filepath: newFileName });
    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await fs.promises.rm(newFileName);
    const files = await getChangedFiles({ dir });

    expect(files).toStrictEqual([{ path: newFileName, deleted: true }]);
  });

  it('should return an empty array if no files were changed', async () => {
    await fs.promises.writeFile(newFileName, '');
    await git.add({ fs, dir, filepath: newFileName });
    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    const files = await getChangedFiles({ dir });

    expect(files).toStrictEqual([]);
  });
});

describe('gitCommitAll', () => {
  const newFileName2 = 'newFile2';
  it('should stage and commit all the new files in the working directory', async () => {
    await Promise.all([
      fs.promises.writeFile(newFileName, ''),
      fs.promises.writeFile(newFileName2, ''),
    ]);

    await gitCommitAll({
      dir,
      message: 'initial commit',
      author,
    });

    const statuses = await Promise.all([
      git.status({ fs, dir, filepath: newFileName }),
      git.status({ fs, dir, filepath: newFileName2 }),
    ]);

    expect(statuses).toStrictEqual(['unmodified', 'unmodified']);
  });

  it('should stage and commit removed files', async () => {
    await Promise.all([
      fs.promises.writeFile(newFileName, ''),
      fs.promises.writeFile(newFileName2, ''),
    ]);

    await Promise.all([
      git.add({ fs, dir, filepath: newFileName }),
      git.add({ fs, dir, filepath: newFileName }),
    ]);

    await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await Promise.all([
      fs.promises.rm(newFileName),
      fs.promises.rm(newFileName2),
    ]);

    await gitCommitAll({
      dir,
      message: 'remove commit',
      author,
    });

    const statuses = await Promise.all([
      git.status({ fs, dir, filepath: newFileName }),
      git.status({ fs, dir, filepath: newFileName2 }),
    ]);

    expect(statuses).toStrictEqual(['absent', 'absent']);
  });
});
