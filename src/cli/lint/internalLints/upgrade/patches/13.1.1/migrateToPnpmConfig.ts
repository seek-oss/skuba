import { inspect } from 'util';

import fs from 'fs-extra';
import { SemVer, lt } from 'semver';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import {
  getConsumerManifest,
  getSkubaManifest,
} from '../../../../../../utils/manifest.js';
import { installPnpmPlugin } from '../../../../../init/installPnpmPlugin.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const migrateToPnpmConfig: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let pnpmWorkSpaceFile: string;
  try {
    pnpmWorkSpaceFile = await fs.promises.readFile(
      'pnpm-workspace.yaml',
      'utf8',
    );
  } catch {
    return {
      result: 'skip',
      reason: 'no pnpm-workspace.yaml found',
    };
  }

  // Remove entire # managed by skuba comments block

  const startingIndexText = '# managed by skuba';
  const endOfSectionIndexText = '# end managed by skuba\n';

  const startingIndex = pnpmWorkSpaceFile.indexOf(startingIndexText);
  const endOfSectionIndex = pnpmWorkSpaceFile.indexOf(endOfSectionIndexText);

  if (startingIndex === -1 || endOfSectionIndex === -1) {
    return {
      result: 'skip',
      reason: 'no managed by skuba comment block found',
    };
  }

  const endSection = pnpmWorkSpaceFile.slice(
    endOfSectionIndex + endOfSectionIndexText.length,
  );

  let modifiedPnpmWorkspace =
    pnpmWorkSpaceFile.slice(0, startingIndex) + endSection;

  // Check if consumers have extended the publicHoistPattern section
  // Only match if the first non-empty, non-comment line is a list item without a preceding key
  const brokenYamlPatternRegex = /^\s*-\s+[^#]/;
  const firstNonEmptyNonCommentLine = endSection
    .split('\n')
    .find((line) => line.trim() && !line.trim().startsWith('#'));
  if (
    firstNonEmptyNonCommentLine &&
    brokenYamlPatternRegex.exec(firstNonEmptyNonCommentLine)
  ) {
    modifiedPnpmWorkspace = modifiedPnpmWorkspace.replace(
      endSection,
      `publicHoistPattern:\n${endSection}`,
    );
  }

  // Migrate minimumReleaseAgeExcludeOverload
  const [packageJson, skubaPackageJson] = await Promise.all([
    getConsumerManifest(),
    getSkubaManifest(),
  ]);

  if (
    packageJson?.packageJson.minimumReleaseAgeExcludeOverload &&
    Array.isArray(packageJson.packageJson.minimumReleaseAgeExcludeOverload)
  ) {
    modifiedPnpmWorkspace += `\nminimumReleaseAgeExclude:\n${packageJson.packageJson.minimumReleaseAgeExcludeOverload.map((item) => `  - '${item}'`).join('\n')}\n`;
    delete packageJson.packageJson.minimumReleaseAgeExcludeOverload;
  }

  if (typeof packageJson?.packageJson.packageManager === 'string') {
    const version = packageJson.packageJson.packageManager
      .split('@')?.[1] // strip name
      ?.split('+')?.[0]; // strip sha

    if (
      typeof version === 'string' &&
      lt(new SemVer(version), new SemVer('10.26.1'))
    ) {
      packageJson.packageJson.packageManager = 'pnpm@10.26.1';
    }
  }

  if (modifiedPnpmWorkspace === pnpmWorkSpaceFile) {
    return {
      result: 'skip',
      reason: 'no changes needed to pnpm-workspace.yaml',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  const stringifiedPackageJson =
    packageJson && `${JSON.stringify(packageJson.packageJson, null, 2)}\n`;

  await Promise.all([
    fs.promises.writeFile('pnpm-workspace.yaml', modifiedPnpmWorkspace, 'utf8'),
    stringifiedPackageJson &&
    fs.promises.writeFile(packageJson.path, stringifiedPackageJson, 'utf8'),
  ]);

  await installPnpmPlugin(skubaPackageJson);

  // Run pnpm install to ensure hoisting/build scripts are run
  await exec('pnpm', 'install', '--offline');

  return {
    result: 'apply',
  };
};

export const tryMigrateToPnpmConfig: PatchFunction = async (config) => {
  try {
    return await migrateToPnpmConfig(config);
  } catch (err) {
    log.warn('Failed to migrate to pnpm-plugin-skuba');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
