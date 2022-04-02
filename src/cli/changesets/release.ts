import fs from 'fs/promises';
import path from 'path';

import type { Package } from '@manypkg/get-packages';
import { getPackages } from '@manypkg/get-packages';

import * as github from '../../api/github';

import { getChangelogEntry } from './changelog';

interface CommonError {
  code: string;
}

interface CreateReleaseParam {
  pkg: Package;
  tagName: string;
}

const createRelease = async ({ pkg, tagName }: CreateReleaseParam) => {
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

    await github.createRelease({
      tagName,
      releaseName: tagName,
      changelog: changelogEntry.content,
      isPrerelease: pkg.packageJson.version.includes('-'),
    });
  } catch (err) {
    // if we can't find a changelog, the user has probably disabled changelogs
    if ((err as CommonError).code !== 'ENOENT') {
      throw err;
    }
  }
};

interface PublishedPackage {
  name: string;
  version: string;
}

interface ReleaseResults {
  published: boolean;
  publishedPackages?: PublishedPackage[];
}

export const releasePackages = async (
  dir: string,
  publishOutput: string,
): Promise<ReleaseResults> => {
  const { packages, tool } = await getPackages(dir);
  const releasedPackages: Package[] = [];

  if (tool !== 'root') {
    const newTagRegex = /New tag:\s+(@[^/]+\/[^@]+|[^/]+)@([^\s]+)/;
    const packagesByName = new Map(
      packages.map((x) => [x.packageJson.name, x]),
    );

    for (const line of publishOutput.split('\n')) {
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
        createRelease({
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

    for (const line of publishOutput.split('\n')) {
      const match = newTagRegex.exec(line);

      if (match) {
        releasedPackages.push(pkg);
        await createRelease({
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
};
