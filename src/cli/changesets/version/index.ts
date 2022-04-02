import type { PreState } from '@changesets/types';

import * as git from '../../../api/git';
import { createExec } from '../../../utils/exec';
import type { Logger } from '../../../utils/logging';

import { getChangedPackages, getPackageVersions } from './packages';
import { createPullRequest } from './pullRequest';

interface VersionParams {
  dir: string;
  currentBranch: string;
  preState: PreState | undefined;
  versionBranch: string;
}

const createCommitMessage = (preState: PreState | undefined): string =>
  `Version Packages${preState ? ` (${preState.tag})` : ''}`;

export const runVersion = async (
  logger: Logger,
  { currentBranch, dir, preState, versionBranch }: VersionParams,
) => {
  await git.createBranch({ dir, name: versionBranch, clean: true });

  const currentVersions = await getPackageVersions(dir);

  const exec = createExec({ cwd: dir });
  await exec('changeset', 'version');

  // project with `commit: true` setting could have already committed files
  const [changedFiles, changedPackages] = await Promise.all([
    git.getChangedFiles({ dir }),
    getChangedPackages(dir, currentVersions),
  ]);

  if (!changedFiles.length) {
    await git.commitAllChanges({ dir, message: createCommitMessage(preState) });
  }

  await git.push({
    auth: { type: 'gitHubApp' },
    dir,
    ref: versionBranch,
    force: true,
  });

  await createPullRequest(logger, {
    changedPackages,
    currentBranch,
    preState,
    versionBranch,
  });
};
