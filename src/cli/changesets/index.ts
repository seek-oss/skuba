import * as Git from '../../api/git';
import { hasDebugFlag } from '../../utils/args';
import { createLogger } from '../../utils/logging';

import { runPublish } from './publish';
import { readChangesetState } from './state';
import { runVersion } from './version';

const RELEASE_BRANCH_PREFIX = 'changeset-release/';

export const changesetsRelease = async (args = process.argv) => {
  const cwd = process.cwd();
  const debug = hasDebugFlag(args);
  const logger = createLogger(debug);

  const currentBranch = await Git.currentBranch({ dir: cwd });

  if (!currentBranch) {
    logger.err('Could not determine the current git branch');
    process.exit(1);
  }

  const isReleaseBranch = currentBranch.startsWith(RELEASE_BRANCH_PREFIX);

  if (isReleaseBranch) {
    logger.plain(
      'changeset-release branch detected. Skipping publish and version',
    );
    return;
  }

  const { changesets, preState } = await readChangesetState(cwd);

  const hasChangesets = Boolean(changesets.length !== 0);

  if (!hasChangesets) {
    logger.plain('No changesets found, attempting run publish');

    return await runPublish(logger, { dir: cwd });
  }

  logger.plain('Changesets found, attempting run version');

  const versionBranch = `${RELEASE_BRANCH_PREFIX}${currentBranch}`;

  return await runVersion(logger, {
    currentBranch,
    dir: cwd,
    preState,
    versionBranch,
  });
};
