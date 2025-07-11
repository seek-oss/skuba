import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';

import { currentBranch } from './currentBranch';

jest.mock('fs', () => memfs);

// eslint-disable-next-line import-x/order
import fs from 'fs-extra';

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
