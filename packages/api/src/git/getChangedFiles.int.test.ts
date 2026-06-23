import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';
import { beforeEach, expect, it, vi } from 'vitest';

import newGit from '../../../../integration/git/new.json' with { type: 'json' };

import { getChangedFiles } from './getChangedFiles.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

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
  ]);

  await git.add({ fs, dir, filepath: ['a', 'b'] });
  await git.commit({
    fs,
    dir,
    message: 'initial commit',
    author,
  });

  await Promise.all([
    fs.promises.rm('a'),
    fs.promises.writeFile('b', '2'),
    fs.promises.writeFile('c', '2'),
  ]);

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
    ],
  });

  expect(files).toStrictEqual([
    // b file change is matched and therefore ignored
    { path: 'a', state: 'deleted' },
    { path: 'c', state: 'added' },
  ]);
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

it('should ignore git-lfs files', async () => {
  await fs.promises.writeFile(
    '.gitattributes',
    '*.pdf filter=lfs diff=lfs merge=lfs -text',
  );
  await git.add({ fs, dir, filepath: '.gitattributes' });
  await git.commit({ fs, dir, message: 'initial commit', author });

  await fs.promises.writeFile('file.pdf', 'content');
  await fs.promises.writeFile('file.not-pdf', 'content');
  await fs.promises.mkdir('nested');
  await fs.promises.writeFile('nested/file.pdf', 'content');

  const files = await getChangedFiles({
    dir,
    ignore: [],
  });

  expect(files).toStrictEqual([{ path: 'file.not-pdf', state: 'added' }]);
});

it('should support diffing an arbitrary src and dst', async () => {
  await Promise.all([
    fs.promises.writeFile('modified.txt', 'before'),
    fs.promises.writeFile('deleted.txt', 'before'),
  ]);
  await git.add({ fs, dir, filepath: ['modified.txt', 'deleted.txt'] });
  await git.commit({ fs, dir, message: 'initial commit', author });

  await git.branch({ fs, dir, ref: 'feature', checkout: true });

  await Promise.all([
    fs.promises.writeFile('modified.txt', 'after'),
    fs.promises.rm('deleted.txt'),
    fs.promises.writeFile('added.txt', 'new'),
  ]);
  await Promise.all([
    git.add({ fs, dir, filepath: ['modified.txt', 'added.txt'] }),
    git.remove({ fs, dir, filepath: 'deleted.txt' }),
  ]);
  const dst = await git.commit({ fs, dir, message: 'feature changes', author });

  const files = await getChangedFiles({ dir, src: 'main', dst });

  expect(files).toStrictEqual([
    { path: 'added.txt', state: 'added' },
    { path: 'deleted.txt', state: 'deleted' },
    { path: 'modified.txt', state: 'modified' },
  ]);
});

it('should support diffing the HEAD commit', async () => {
  await git.commit({ fs, dir, message: 'initial commit', author });
  await Promise.all([
    fs.promises.writeFile('1.txt', 'before'),
    fs.promises.writeFile('2.txt', 'before'),
  ]);
  await git.add({ fs, dir, filepath: ['1.txt', '2.txt'] });
  await git.commit({ fs, dir, message: 'initial commit', author });

  const files = await getChangedFiles({ dir, dst: 'HEAD' });

  expect(files).toStrictEqual([
    { path: '1.txt', state: 'added' },
    { path: '2.txt', state: 'added' },
  ]);
});

it('should throw if src is no provided and dst has no parent', async () => {
  const oid = await git.commit({ fs, dir, message: 'initial commit', author });

  await expect(getChangedFiles({ dir, dst: 'HEAD' })).rejects.toThrow(
    new Error(
      `Failed to determine changed files in Git: src parameter was omitted but dst (HEAD, ${oid}) has no parent`,
    ),
  );
});
