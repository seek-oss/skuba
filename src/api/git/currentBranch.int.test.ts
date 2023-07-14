import git from 'isomorphic-git';
import memfs, { vol } from 'memfs';

import { currentBranch } from './currentBranch';

jest.mock('fs-extra', () => memfs);

// eslint-disable-next-line import/order
import fs from 'fs-extra';

beforeEach(async () => {
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
