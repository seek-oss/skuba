import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';

import { getOwnerAndRepo } from './remote.js';

jest.mock('fs', () => memfs);

beforeEach(async () => {
  delete process.env.BUILDKITE_REPO;
  delete process.env.GITHUB_REPOSITORY;

  vol.reset();

  vol.fromJSON({
    '.git': null,
  });

  await git.init({
    dir: '.',
    fs: memfs.fs,
  });

  await git.addRemote({
    dir: '.',
    fs: memfs.fs,
    remote: 'origin',
    url: 'git@github.com:owner/repo.git',
  });
});

it('handles a Git root dir', async () => {
  await expect(getOwnerAndRepo({ dir: '.' })).resolves.toMatchInlineSnapshot(`
    {
      "owner": "owner",
      "repo": "repo",
    }
  `);
});

it('handles a nested dir', async () => {
  await expect(getOwnerAndRepo({ dir: 'c/d' })).resolves.toMatchInlineSnapshot(`
    {
      "owner": "owner",
      "repo": "repo",
    }
  `);
});
