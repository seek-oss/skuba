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

  expect(files).toStrictEqual([{ path: newFileName, state: 'added' }]);
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

  expect(files).toStrictEqual([{ path: newFileName, state: 'modified' }]);
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

  expect(files).toStrictEqual([{ path: newFileName, state: 'deleted' }]);
});

it('should exclude file changes based on ignore parameter', async () => {
  await Promise.all([
    fs.promises.writeFile('a', '1'),
    fs.promises.writeFile('b', '1'),
    fs.promises.writeFile('d', '1'),
    fs.promises.writeFile('e', '1'),
  ]);

  await git.add({ fs, dir, filepath: ['a', 'b', 'd', 'e'] });
  await git.commit({
    fs,
    dir,
    message: 'initial commit',
    author,
  });

  await Promise.all([
    fs.promises.rm('a'),
    fs.promises.writeFile('b', '21'),
    fs.promises.writeFile('c', '21'),
    fs.promises.writeFile('d', '21'),
    fs.promises.writeFile('e', '21'),
  ]);

  const ruleD = jest.fn().mockReturnValue(true);
  const ruleE = jest.fn().mockReturnValue(false);

  const files = await getChangedFiles({
    dir,
    ignore: [
      {
        path: 'c',
        // c file change is not matched
        state: 'modified',
      },
      {
        path: 'a',
        // a file change is not matched
        state: 'added',
      },
      {
        // b file change is matched and therefore ignored
        path: 'b',
        state: 'modified',
      },
      {
        // d file change is matched, rule returns true and therefore ignored
        path: 'd',
        state: 'modified',
        rule: ruleD,
      },
      {
        // e file change is matched, rule returns false and therefore not ignored
        path: 'e',
        state: 'modified',
        rule: ruleE,
      },
    ],
  });

  expect(files).toStrictEqual([
    // b file change is matched and therefore ignored
    { path: 'a', state: 'deleted' },
    { path: 'c', state: 'added' },
    { path: 'e', state: 'modified' },
  ]);

  expect(ruleD).toHaveBeenCalledWith({
    dir,
    file: { path: 'd', state: 'modified' },
  });
  expect(ruleE).toHaveBeenCalledWith({
    dir,
    file: { path: 'e', state: 'modified' },
  });
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
