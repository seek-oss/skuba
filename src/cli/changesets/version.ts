/* eslint-disable no-console */
// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/run.ts
import path from 'path';

import type { PreState } from '@changesets/types';
import fs from 'fs-extra';
import resolveFrom from 'resolve-from';

import * as git from '../../api/git';
import * as github from '../../api/github';
import type { PullRequestDetails } from '../../api/github/pullRequest';
import { createExec } from '../../utils/exec';
import type { Logger } from '../../utils/logging';

import {
  getChangedPackages,
  getChangelogEntry,
  getVersionsByDirectory,
  sortTheThings,
} from './utils';

interface VersionParams {
  dir: string;
  currentBranch: string;
  preState: PreState | undefined;
  versionBranch: string;
}

const createCommitMessage = (preState: PreState | undefined): string =>
  `Version Packages${preState ? ` (${preState.tag})` : ''}`;

const createPrTitle = (preState: PreState | undefined): string =>
  `Version Packages${preState ? ` (${preState.tag})` : ''}`;

const createPrBody = async ({
  dir,
  currentBranch,
  preState,
  currentVersions,
}: {
  dir: string;
  currentBranch: string;
  preState: PreState | undefined;
  currentVersions: Map<string, string>;
}) => {
  const changedPackages = await getChangedPackages(dir, currentVersions);

  const packages = await Promise.all(
    changedPackages.map(async (pkg) => {
      const changelogContents = await fs.readFile(
        path.join(pkg.dir, 'CHANGELOG.md'),
        'utf8',
      );

      const entry = getChangelogEntry(
        changelogContents,
        pkg.packageJson.version,
      );
      return {
        highestLevel: entry.highestLevel,
        private: Boolean(pkg.packageJson.private),
        content: `## ${pkg.packageJson.name}@${pkg.packageJson.version}\n\n${entry.content}`,
      };
    }),
  );

  const releases = packages
    .filter((x) => x)
    .sort(sortTheThings)
    .map((x) => x.content)
    .join('\n ');

  const preStateText = preState
    ? `\n${currentBranch}\` is currently in **pre mode** so this branch has prereleases rather than normal releases. If you want to exit prereleases, run \`changeset pre exit\` on \`${currentBranch}\``
    : '';

  return `This PR was opened by skuba. When you're ready to do a release, you can merge this and the packages will be published to npm automatically. If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${currentBranch}, this PR will be updated.
${preStateText}
# Releases
${releases}`;
};

export const runVersion = async (
  logger: Logger,
  { currentBranch, dir, preState, versionBranch }: VersionParams,
) => {
  await git.createBranch({ dir, name: versionBranch, clean: true });

  const currentVersions = await getVersionsByDirectory(dir);

  const exec = createExec({ cwd: dir });
  await exec('node', resolveFrom(dir, '@changesets/cli/bin.js'), 'version');

  // project with `commit: true` setting could have already committed files
  const changedFiles = await git.getChangedFiles({ dir });
  if (!changedFiles.length) {
    await git.commitAllChanges({ dir, message: createCommitMessage(preState) });
  }

  await git.push({
    auth: { type: 'gitHubApp' },
    dir,
    ref: versionBranch,
    force: true,
  });

  const [body, number] = await Promise.all([
    createPrBody({
      currentBranch,
      dir,
      preState,
      currentVersions,
    }),
    github.getPullRequestNumberByBranches({
      head: versionBranch,
      base: currentBranch,
    }),
  ]);

  const title = createPrTitle(preState);

  let result: PullRequestDetails;
  if (number) {
    logger.plain('Existing PR Found. Updating PR with new package versions');
    result = await github.updatePullRequest({ body, title, number });
  } else {
    logger.plain('Creating a PR with new package versions');
    result = await github.createPullRequest({
      base: currentBranch,
      head: versionBranch,
      title,
      body,
    });
  }

  logger.plain(`Version Packages PR: ${result.url}`);
};
