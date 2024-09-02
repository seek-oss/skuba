import path from 'path';

import fs from 'fs-extra';
import type { NormalizedReadResult } from 'read-pkg-up';

import { type TextProcessor, copyFiles } from '../../utils/copy';
import { log } from '../../utils/logging';
import type { ProjectType } from '../../utils/manifest';
import { getSkubaVersion, latestNpmVersion } from '../../utils/version';

import { diffDependencies } from './analysis/package';
import * as dependencyMutators from './dependencies';
import { formatPackage } from './processing/package';
import type { DependencyDiff } from './types';

const logDiff = (diff: DependencyDiff): boolean => {
  const entries = Object.entries(diff);

  if (entries.length === 0) {
    log.ok('✔ No changes');

    return false;
  }

  Object.entries(diff)
    .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
    .forEach(([name, { operation, version }]) =>
      log.plain(operation, name, log.formatSubtle(version)),
    );

  return true;
};

const pinUnspecifiedVersions = async (
  dependencies: Record<string, string>,
): Promise<void> => {
  const updates = await Promise.all(
    Object.entries(dependencies)
      .filter(([, version]) => version === '*')
      .map(async ([name]) => {
        const version = await (name === 'skuba'
          ? getSkubaVersion()
          : latestNpmVersion(name));

        return [name, version] as const;
      }),
  );

  updates.forEach(([name, version]) => {
    dependencies[name] = version;
  });
};

interface Props {
  destinationRoot: string;
  include: (pathname: string) => boolean;
  manifest: NormalizedReadResult;
  type: ProjectType;
}

export const analyseDependencies = async ({
  destinationRoot,
  include,
  manifest: { packageJson },
  type,
}: Props): Promise<undefined | (() => Promise<void>)> => {
  const input = {
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
    type,
  };

  const output = {
    dependencies: { ...input.dependencies },
    devDependencies: { ...input.devDependencies },
    type,
  };

  const processors = Object.values(dependencyMutators).reduce<TextProcessor[]>(
    (acc, mutate) => {
      const newProcessors = mutate(output);
      acc.push(...newProcessors);
      return acc;
    },
    [],
  );

  await Promise.all([
    pinUnspecifiedVersions(output.dependencies),
    pinUnspecifiedVersions(output.devDependencies),
  ]);

  const dependencyDiff = diffDependencies({
    old: input.dependencies,
    new: output.dependencies,
  });

  log.newline();
  log.plain(log.bold('Dependencies:'));

  log.newline();
  const hasDependencyDiff = logDiff(dependencyDiff);

  const devDependencyDiff = diffDependencies({
    old: input.devDependencies,
    new: output.devDependencies,
  });

  log.newline();
  log.plain(log.bold('Dev dependencies:'));

  log.newline();
  const hasDevDependencyDiff = logDiff(devDependencyDiff);

  const packageJsonFilepath = path.join(destinationRoot, 'package.json');

  if (!hasDependencyDiff && !hasDevDependencyDiff) {
    return;
  }

  return async () => {
    const updatedPackageJson = await formatPackage({
      ...packageJson,
      dependencies: output.dependencies,
      devDependencies: output.devDependencies,
    });

    await fs.promises.writeFile(packageJsonFilepath, updatedPackageJson);

    if (processors.length === 0) {
      return;
    }

    await copyFiles({
      sourceRoot: destinationRoot,
      destinationRoot,
      include,
      processors,
    });
  };
};
