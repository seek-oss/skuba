import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';

import newGit from '../../../integration/git/new.json';

import { commitAllChanges } from './commitAllChanges';

jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON(newGit);
});

const author = { name: 'user', email: 'user@email.com' };
const dir = './';
const newFileName = 'newFile';
const newFileName2 = 'newFile2';

it('should stage and commit all the new files in the working directory', async () => {
  await Promise.all([
    fs.promises.writeFile(newFileName, ''),
    fs.promises.writeFile(newFileName2, ''),
  ]);

  await commitAllChanges({
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

  await commitAllChanges({
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
