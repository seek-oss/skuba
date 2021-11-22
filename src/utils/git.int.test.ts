import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import basicGit from '../../integration/git/basic.json';

import { gitReset } from './git';

jest.mock('fs-extra', () => memfs);

const author = { name: 'user', email: 'user@email.com' };
const dir = './';

beforeEach(() => {
  vol.reset();
});

describe('gitReset', () => {
  describe('soft', () => {
    it('should keep the file added in another commit in the working directory', async () => {
      vol.fromJSON(basicGit);

      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      const newFileName = 'newFile';
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
      vol.fromJSON(basicGit);

      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      const newFileName = 'newFile';
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

    it('should remove files which are staged', async () => {
      vol.fromJSON(basicGit);

      const initialCommit = await git.commit({
        fs,
        dir,
        message: 'initial commit',
        author,
      });

      const newFileName = 'newFile';
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
      vol.fromJSON(basicGit);

      const newFileName = 'newFile';

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
