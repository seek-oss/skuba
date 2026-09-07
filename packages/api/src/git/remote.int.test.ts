import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { getOwnerAndRepo } from './remote.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  vi.stubEnv('BUILDKITE_REPO', undefined);
  vi.stubEnv('GITHUB_REPOSITORY', undefined);

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
