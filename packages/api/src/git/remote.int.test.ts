import { beforeEach, expect, it, vi } from 'vitest';
import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';

import { getOwnerAndRepo } from './remote.js';

vi.mock('fs', () => memfs);

// eslint-disable-next-line import-x/order
import fs from 'fs-extra';

beforeEach(async () => {
  delete process.env.BUILDKITE_REPO;
  delete process.env.GITHUB_REPOSITORY;

  vol.reset();

  vol.fromJSON({
    '.git': null,
  });

  await git.init({
    dir: '.',
    fs,
  });

  await git.addRemote({
    dir: '.',
    fs,
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
