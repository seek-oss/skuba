import path from 'path';

import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import newGit from '../../../integration/git/new.json';

import { commitAllChanges } from './commitAllChanges.js';

jest.mock('fs', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON(newGit);
});

const author = { name: 'user', email: 'user@email.com' };
const dir = './';
const newFileName = 'newFile';
const newFileName2 = 'newFile2';

it('should stage and commit all the new files in the working directory', async () => {
  const expectStatuses = (statuses: string[]) =>
    expect(
      Promise.all([
        git.status({ fs, dir, filepath: newFileName }),
        git.status({ fs, dir, filepath: newFileName2 }),
      ]),
    ).resolves.toStrictEqual(statuses);

  await expectStatuses(['absent', 'absent']);

  await Promise.all([
    fs.promises.writeFile(newFileName, ''),
    fs.promises.writeFile(newFileName2, ''),
  ]);

  await expectStatuses(['*added', '*added']);

  await expect(
    commitAllChanges({
      dir,
      message: 'initial commit',
      author,
    }),
  ).resolves.toMatch(/^[0-9a-f]{40}$/);

  await expectStatuses(['unmodified', 'unmodified']);
});

it('should stage and commit removed files', async () => {
  await Promise.all([
    fs.promises.writeFile(newFileName, ''),
    fs.promises.writeFile(newFileName2, ''),
  ]);

  await Promise.all([
    git.add({ fs, dir, filepath: newFileName }),
    git.add({ fs, dir, filepath: newFileName2 }),
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

  await expect(
    commitAllChanges({
      dir,
      message: 'remove commit',
      author,
    }),
  ).resolves.toMatch(/^[0-9a-f]{40}$/);

  const statuses = await Promise.all([
    git.status({ fs, dir, filepath: newFileName }),
    git.status({ fs, dir, filepath: newFileName2 }),
  ]);

  expect(statuses).toStrictEqual(['absent', 'absent']);
});

it('should handle a nested working directory', async () => {
  const nestedDir = path.join(dir, '/packages/package');

  await fs.promises.mkdir(nestedDir, { recursive: true });

  await Promise.all([
    fs.promises.writeFile(path.join(nestedDir, newFileName), ''),
    // Not in our `nestedDir`!
    fs.promises.writeFile(newFileName2, ''),
  ]);

  await commitAllChanges({
    dir: nestedDir,
    message: 'initial commit',
    author,
  });

  await expect(
    commitAllChanges({
      dir: nestedDir,
      message: 'initial commit',
      author,
    }),
  ).resolves.toMatch(/^[0-9a-f]{40}$/);

  const statuses = await Promise.all([
    git.status({ fs, dir, filepath: newFileName }),
    git.status({ fs, dir, filepath: newFileName2 }),
    git.status({ fs, dir, filepath: path.join(nestedDir, newFileName) }),
    git.status({ fs, dir, filepath: path.join(nestedDir, newFileName2) }),
  ]);

  // The file outside of our `nestedDir` remains uncommitted.
  expect(statuses).toStrictEqual(['absent', '*added', 'unmodified', 'absent']);
});

it('should no-op on clean directory', async () => {
  await expect(
    commitAllChanges({
      dir,
      message: 'remove commit',
      author,
    }),
  ).resolves.toBeUndefined();

  const statuses = await Promise.all([
    git.status({ fs, dir, filepath: newFileName }),
    git.status({ fs, dir, filepath: newFileName2 }),
  ]);

  expect(statuses).toStrictEqual(['absent', 'absent']);
});

it('should work in a directory which is not relative with a gitIgnore file', async () => {
  const gitIgnoreFilename = '.gitignore';
  const gitIgnoreContent = `/${newFileName2}`;

  await Promise.all([
    fs.promises.writeFile(gitIgnoreFilename, gitIgnoreContent),
    fs.promises.writeFile(newFileName, ''),
    fs.promises.writeFile(newFileName2, ''),
  ]);

  await Promise.all([
    git.add({ fs, dir, filepath: gitIgnoreFilename }),
    git.add({ fs, dir, filepath: newFileName }),
    git.add({ fs, dir, filepath: newFileName2 }),
  ]);

  await expect(
    commitAllChanges({
      dir: process.cwd(),
      message: 'remove commit',
      author,
    }),
  ).resolves.toMatch(/^[0-9a-f]{40}$/);

  const statuses = await Promise.all([
    git.status({ fs, dir, filepath: newFileName }),
    git.status({ fs, dir, filepath: newFileName2 }),
  ]);

  expect(statuses).toStrictEqual(['unmodified', 'ignored']);
});
