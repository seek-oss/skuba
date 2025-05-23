import memfs, { fs, vol } from 'memfs';

import newGit from '../../../integration/git/new.json';

import { reset } from './reset';

jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON(newGit);
});

const author = { name: 'user', email: 'user@email.com' };
const dir = './';
const newFileName = 'newFile';

describe('soft', () => {
  it('should keep the file added in another commit in the working directory', async () => {
    const git = await import('isomorphic-git');

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

    await reset({ dir, branch: 'main', commitId: initialCommit });

    const commits = await git.log({
      fs,
      dir,
      depth: 1,
    });

    const directory = await fs.promises.readdir(dir);

    expect(commits[0]!.oid).toEqual(initialCommit);
    expect(directory).toContain(newFileName);
  });
});

describe('hard', () => {
  it('should remove the file added in another commit from the working directory', async () => {
    const git = await import('isomorphic-git');

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

    await reset({
      dir,
      branch: 'main',
      commitId: initialCommit,
      hard: true,
    });

    const commits = await git.log({
      fs,
      dir,
      depth: 1,
    });

    const directory = await fs.promises.readdir(dir);

    expect(commits[0]?.oid).toEqual(initialCommit);
    expect(directory).not.toContain(newFileName);
  });

  it('should keep new files which are not committed in the working directory', async () => {
    const git = await import('isomorphic-git');

    const initialCommit = await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await fs.promises.writeFile(newFileName, '');

    await reset({
      dir,
      branch: 'main',
      commitId: initialCommit,
      hard: true,
    });

    const commits = await git.log({
      fs,
      dir,
      depth: 1,
    });

    const directory = await fs.promises.readdir(dir);

    expect(commits[0]?.oid).toEqual(initialCommit);
    expect(directory).toContain(newFileName);
  });

  it('should remove files which are staged', async () => {
    const git = await import('isomorphic-git');

    const initialCommit = await git.commit({
      fs,
      dir,
      message: 'initial commit',
      author,
    });

    await fs.promises.writeFile(newFileName, '');
    await git.add({ fs, dir, filepath: newFileName });

    await reset({
      dir,
      branch: 'main',
      commitId: initialCommit,
      hard: true,
    });

    const commits = await git.log({
      fs,
      dir,
      depth: 1,
    });

    const directory = await fs.promises.readdir(dir);

    expect(commits[0]?.oid).toEqual(initialCommit);
    expect(directory).not.toContain(newFileName);
  });

  it('should revert files which were modified', async () => {
    const git = await import('isomorphic-git');

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

    await reset({
      dir,
      branch: 'main',
      commitId: initialCommit,
      hard: true,
    });

    const commits = await git.log({
      fs,
      dir,
      depth: 1,
    });

    const file = await fs.promises.readFile(newFileName, 'utf-8');

    expect(commits[0]?.oid).toEqual(initialCommit);
    expect(file).toBe('hello');
  });
});
