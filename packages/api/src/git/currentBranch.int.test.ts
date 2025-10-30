import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';
import { beforeEach, expect, it, vi } from 'vitest';
import fs from 'fs-extra';

import { currentBranch } from './currentBranch.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

beforeEach(async () => {
  delete process.env.BUILDKITE_BRANCH;
  delete process.env.GITHUB_HEAD_REF;
  delete process.env.GITHUB_REF_NAME;

  vol.reset();

  vol.fromJSON({
    '.git': null,
  });

  await git.init({
    dir: '.',
    fs,
  });

  await git.branch({
    checkout: true,
    dir: '.',
    fs,
    ref: 'develop',
  });
});

it('handles a Git root dir', async () => {
  await expect(currentBranch({ dir: '.' })).resolves.toMatchInlineSnapshot(
    `"develop"`,
  );
});

it('handles a nested dir', async () => {
  await expect(currentBranch({ dir: 'c/d' })).resolves.toMatchInlineSnapshot(
    `"develop"`,
  );
});
