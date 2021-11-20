/* eslint-disable no-console */
// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/run.ts
import path from 'path';

import type { Package } from '@manypkg/get-packages';
import { getPackages } from '@manypkg/get-packages';
import fs from 'fs-extra';
import resolveFrom from 'resolve-from';
import * as semver from 'semver';

import * as gitUtils from './gitUtils';
import * as github from './githubAdapter';
import readChangesetState from './readChangesetState';
import {
  exec,
  execWithOutput,
  getChangedPackages,
  getChangelogEntry,
  getVersionsByDirectory,
  sortTheThings,
} from './utils';

type CommonError = {
  code: string;
};

const createRelease = async (
  octokit: ReturnType<typeof github.getOctokit>,
  { pkg, tagName }: { pkg: Package; tagName: string },
) => {
  try {
    const changelogFileName = path.join(pkg.dir, 'CHANGELOG.md');

    const changelog = await fs.readFile(changelogFileName, 'utf8');

    const changelogEntry = getChangelogEntry(
      changelog,
      pkg.packageJson.version,
    );
    if (!changelogEntry) {
      // we can find a changelog but not the entry for this version
      // if this is true, something has probably gone wrong
      throw new Error(
        `Could not find changelog entry for ${pkg.packageJson.name}@${pkg.packageJson.version}`,
      );
    }

    await octokit.repos.createRelease({
      name: tagName,
      tag_name: tagName,
      body: changelogEntry.content,
      prerelease: pkg.packageJson.version.includes('-'),
      ...(await github.context(process.cwd())).repo,
    });
  } catch (err) {
    // if we can't find a changelog, the user has probably disabled changelogs
    if ((err as CommonError).code !== 'ENOENT') {
      throw err;
    }
  }
};

type PublishOptions = {
  script: string;
  githubToken: string;

  cwd?: string;
  octokit: github.Octokit;
};

type PublishedPackage = { name: string; version: string };

type PublishResult =
  | {
      published: true;
      publishedPackages: PublishedPackage[];
    }
  | {
      published: false;
    };

export async function runPublish({
  script,
  githubToken,
  cwd = process.cwd(),
  octokit,
}: PublishOptions): Promise<PublishResult> {
  const [publishCommand, ...publishArgs] = script.split(/\s+/);

  const existingTags = await gitUtils.listTags(cwd);

  const changesetPublishOutput = await execWithOutput(
    publishCommand,
    publishArgs,
    { cwd },
  );

  const tags = await gitUtils.listTags(cwd);
  const newTags = tags.filter((tag) => !existingTags.includes(tag));

  await gitUtils.pushTags(cwd, newTags, githubToken);

  const { packages, tool } = await getPackages(cwd);
  const releasedPackages: Package[] = [];

  if (tool !== 'root') {
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(
      packages.map((x) => [x.packageJson.name, x]),
    );

    for (const line of (changesetPublishOutput.stdout as string).split('\n')) {
      const match = newTagRegex.exec(line);
      if (match === null) {
        continue;
      }
      const pkgName = match[1];
      const pkg = packagesByName.get(pkgName);
      if (pkg === undefined) {
        throw new Error(
          `Package "${pkgName}" not found.` +
            'This is probably a bug in the action, please open an issue',
        );
      }
      releasedPackages.push(pkg);
    }

    await Promise.all(
      releasedPackages.map((pkg) =>
        createRelease(octokit, {
          pkg,
          tagName: `${pkg.packageJson.name}@${pkg.packageJson.version}`,
        }),
      ),
    );
  } else {
    if (packages.length === 0) {
      throw new Error(
        `No package found.` +
          'This is probably a bug in the action, please open an issue',
      );
    }
    const pkg = packages[0];
    const newTagRegex = /New tag:/;

    for (const line of (changesetPublishOutput.stdout as string).split('\n')) {
      const match = newTagRegex.exec(line);

      if (match) {
        releasedPackages.push(pkg);
        await createRelease(octokit, {
          pkg,
          tagName: `v${pkg.packageJson.version}`,
        });
        break;
      }
    }
  }

  if (releasedPackages.length) {
    return {
      published: true,
      publishedPackages: releasedPackages.map((pkg) => ({
        name: pkg.packageJson.name,
        version: pkg.packageJson.version,
      })),
    };
  }

  return { published: false };
}

interface PackageJson {
  version: string;
}

const requireChangesetsCliPkgJson = (cwd: string) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(resolveFrom(
      cwd,
      '@changesets/cli/package.json',
    )) as PackageJson;
  } catch (err) {
    if (err && (err as CommonError).code === 'MODULE_NOT_FOUND') {
      throw new Error(
        `Have you forgotten to install \`@changesets/cli\` in "${cwd}"?`,
      );
    }
    throw err;
  }
};

type VersionOptions = {
  script?: string;
  octokit: github.Octokit;
  githubToken: string;
  cwd?: string;
  prTitle?: string;
  commitMessage?: string;
  hasPublishScript?: boolean;
};

export async function runVersion({
  script,
  octokit,
  githubToken,
  cwd = process.cwd(),
  prTitle = 'Version Packages',
  commitMessage = 'Version Packages',
  hasPublishScript = false,
}: VersionOptions) {
  const context = await github.context(cwd);
  const repo = `${context.repo.owner}/${context.repo.repo}`;
  const branch = context.ref.replace('refs/heads/', '');
  const versionBranch = `changeset-release/${branch}`;
  const { preState } = await readChangesetState(cwd);

  await gitUtils.switchToMaybeExistingBranch(cwd, versionBranch);
  await gitUtils.reset(cwd, context.sha, versionBranch);

  const versionsByDirectory = await getVersionsByDirectory(cwd);

  if (script) {
    const [versionCommand, ...versionArgs] = script.split(/\s+/);
    await exec(versionCommand, versionArgs, { cwd });
  } else {
    const changesetsCliPkgJson = requireChangesetsCliPkgJson(cwd);
    const cmd = semver.lt(changesetsCliPkgJson.version, '2.0.0')
      ? 'bump'
      : 'version';
    await exec('node', [resolveFrom(cwd, '@changesets/cli/bin.js'), cmd], {
      cwd,
    });
  }

  const searchQuery = `repo:${repo}+state:open+head:${versionBranch}+base:${branch}`;
  const searchResultPromise = octokit.search.issuesAndPullRequests({
    q: searchQuery,
  });
  const changedPackages = await getChangedPackages(cwd, versionsByDirectory);

  const prBodyPromise = (async () =>
    `This PR was opened by the [Changesets release](https://github.com/changesets/action) GitHub action. When you're ready to do a release, you can merge this and ${
      hasPublishScript
        ? `the packages will be published to npm automatically`
        : `publish to npm yourself or [setup this action to publish automatically](https://github.com/changesets/action#with-publishing)`
    }. If you're not ready to do a release yet, that's fine, whenever you add more changesets to ${branch}, this PR will be updated.
${
  Boolean(preState)
    ? `
⚠️⚠️⚠️⚠️⚠️⚠️
\`${branch}\` is currently in **pre mode** so this branch has prereleases rather than normal releases. If you want to exit prereleases, run \`changeset pre exit\` on \`${branch}\`.
⚠️⚠️⚠️⚠️⚠️⚠️
`
    : ''
}
# Releases
${(
  await Promise.all(
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
  )
)
  .filter((x) => x)
  .sort(sortTheThings)
  .map((x) => x.content)
  .join('\n ')}`)();

  const finalPrTitle = `${prTitle}${preState ? ` (${preState.tag})` : ''}`;

  // project with `commit: true` setting could have already committed files
  if (!(await gitUtils.checkIfClean(cwd))) {
    const finalCommitMessage = `${commitMessage}${
      preState ? ` (${preState.tag})` : ''
    }`;
    await gitUtils.commitAll(cwd, finalCommitMessage);
  }

  await gitUtils.push(cwd, versionBranch, githubToken, { force: true });

  const searchResult = await searchResultPromise;
  console.log(JSON.stringify(searchResult.data, null, 2));
  if (searchResult.data.items.length === 0) {
    console.log('creating pull request');
    await octokit.pulls.create({
      base: branch,
      head: versionBranch,
      title: finalPrTitle,
      body: await prBodyPromise,
      ...context.repo,
    });
  } else {
    await octokit.pulls.update({
      pull_number: searchResult.data.items[0].number,
      title: finalPrTitle,
      body: await prBodyPromise,
      ...context.repo,
    });
    console.log('pull request found');
  }
}
