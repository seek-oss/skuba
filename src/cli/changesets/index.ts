// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/index.ts

/* eslint-disable no-console */

import { apiTokenFromEnvironment } from '../../api/github/environment';

import * as core from './coreAdapter';
import readChangesetState from './readChangesetState';
import { runPublish, runVersion } from './run';

const run = async () => {
  if (!apiTokenFromEnvironment()) {
    core.setFailed('Please add the GITHUB_TOKEN to the changesets action');
  }

  const cwd = process.cwd();

  const { changesets } = await readChangesetState();

  const publishScript = core.getInput('publish');
  const hasChangesets = changesets.length !== 0;
  const hasPublishScript = Boolean(publishScript);

  switch (true) {
    case !hasChangesets && hasPublishScript: {
      console.log(
        'No changesets found, attempting to publish any unpublished packages to npm',
      );

      await runPublish({
        script: publishScript,
        cwd,
      });

      return;
    }
    case hasChangesets:
      await runVersion({
        cwd,
        prTitle: core.getInput('title'),
        commitMessage: core.getInput('commit'),
      });
      return;
  }
};

export const changesets = async () => {
  try {
    await run();
  } catch (err) {
    console.error(err);
    core.setFailed((err as Error).message);
  }
};
