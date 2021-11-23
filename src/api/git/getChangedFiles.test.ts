import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import newGit from '../../../integration/git/new.json';

import { getChangedFiles } from './getChangedFiles';

jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON(newGit);
});

const author = { name: 'user', email: 'user@email.com' };
const dir = './';
const newFileName = 'newFile';

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
