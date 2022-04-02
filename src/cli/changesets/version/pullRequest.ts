// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/run.ts
import path from 'path';

import type { PreState } from '@changesets/types';
import type { Package } from '@manypkg/get-packages';
import fs from 'fs-extra';

import * as github from '../../../api/github';
import type { PullRequestDetails } from '../../../api/github/pullRequest';
import type { Logger } from '../../../utils/logging';
import { getChangelogEntry } from '../changelog';

const createPrTitle = (preState: PreState | undefined): string =>
  `Version Packages${preState ? ` (${preState.tag})` : ''}`;

const sortReleases = (
  a: { private: boolean; highestLevel: number },
  b: { private: boolean; highestLevel: number },
): number => {
  if (a.private === b.private) {
    return b.highestLevel - a.highestLevel;
  }
  if (a.private) {
    return 1;
  }
  return -1;
};

const createPrBody = async ({
  currentBranch,
  preState,
  changedPackages,
}: {
  currentBranch: string;
  preState: PreState | undefined;
  changedPackages: Package[];
}) => {
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
    .sort(sortReleases)
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

interface CreatePullRequestParams {
  currentBranch: string;
  versionBranch: string;
  preState: PreState | undefined;
  changedPackages: Package[];
}

export const createPullRequest = async (
  logger: Logger,
  {
    currentBranch,
    versionBranch,
    preState,
    changedPackages,
  }: CreatePullRequestParams,
) => {
  const [body, number] = await Promise.all([
    createPrBody({
      currentBranch,
      preState,
      changedPackages,
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
