import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { currentBranch } from './currentBranch.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  vi.stubEnv('BUILDKITE_BRANCH', undefined);
  vi.stubEnv('GITHUB_HEAD_REF', undefined);
  vi.stubEnv('GITHUB_REF_NAME', undefined);

  vol.reset();

  vol.fromJSON({
    '.git': null,
  });

  await git.init({
    dir: '.',
    fs: memfs.fs,
  });

  await git.branch({
    checkout: true,
    dir: '.',
    fs: memfs.fs,
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
