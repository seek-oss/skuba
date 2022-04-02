// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/run.ts
import path from 'path';

import type { PreState } from '@changesets/types';
import type { Package } from '@manypkg/get-packages';
import { getPackages } from '@manypkg/get-packages';
import fs from 'fs-extra';
import resolveFrom from 'resolve-from';

import * as git from '../../api/git';
import * as github from '../../api/github';
import type { PullRequestDetails } from '../../api/github/pullRequest';
import { createExec } from '../../utils/exec';
import type { Logger } from '../../utils/logging';

import { getChangelogEntry } from './changelog';

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

type PackageVersions = Record<string, string>;

const getPackageVersions = async (cwd: string): Promise<PackageVersions> => {
  const { packages } = await getPackages(cwd);
  return Object.fromEntries(
    packages.map((pkg) => [pkg.dir, pkg.packageJson.version]),
  );
};

const getChangedPackages = async (
  cwd: string,
  previousVersions: PackageVersions,
) => {
  const { packages } = await getPackages(cwd);
  const changedPackages = new Set<Package>();

  for (const pkg of packages) {
    if (previousVersions[pkg.dir] !== pkg.packageJson.version) {
      changedPackages.add(pkg);
    }
  }

  return [...changedPackages];
};

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

export const runVersion = async (
  logger: Logger,
  { currentBranch, dir, preState, versionBranch }: VersionParams,
) => {
  await git.createBranch({ dir, name: versionBranch, clean: true });

  const currentVersions = await getPackageVersions(dir);

  const exec = createExec({ cwd: dir });
  await exec('node', resolveFrom(dir, '@changesets/cli/bin.js'), 'version');

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
