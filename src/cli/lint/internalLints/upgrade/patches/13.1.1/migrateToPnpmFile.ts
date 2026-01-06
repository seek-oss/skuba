import { inspect } from 'util';

import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { getConsumerManifest } from '../../../../../../utils/manifest.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const migrateToPnpmFile: PatchFunction = async ({
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
  const brokenYamlPatternRegex = /^  -\s+[^#]/m;
  if (brokenYamlPatternRegex.exec(endSection)) {
    modifiedPnpmWorkspace = modifiedPnpmWorkspace.replace(
      endSection,
      `publicHoistPattern:\n${endSection}`,
    );
  }

  // Migrate minimumReleaseAgeExcludeOverload
  const packageJson = await getConsumerManifest();

  if (
    packageJson?.packageJson.minimumReleaseAgeExcludeOverload &&
    Array.isArray(packageJson.packageJson.minimumReleaseAgeExcludeOverload)
  ) {
    modifiedPnpmWorkspace += `\nminimumReleaseAgeExclude:\n${packageJson.packageJson.minimumReleaseAgeExcludeOverload.map((item) => `  - ${item}`).join('\n')}\n`;
    delete packageJson.packageJson.minimumReleaseAgeExcludeOverload;
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

  const pnpmFilePath = '.pnpmfile.cjs';

  const stringifiedPackageJson =
    packageJson && modifiedPnpmWorkspace.includes('minimumReleaseAgeExclude')
      ? `${JSON.stringify(packageJson.packageJson, null, 2)}\n`
      : null;

  await Promise.all([
    fs.promises.writeFile('pnpm-workspace.yaml', modifiedPnpmWorkspace, 'utf8'),
    fs.promises.writeFile(
      pnpmFilePath,
      'module.exports = require("skuba/config/.pnpmfile.cjs");\n',
      'utf8',
    ),
    stringifiedPackageJson &&
      packageJson &&
      fs.promises.writeFile(packageJson.path, stringifiedPackageJson, 'utf8'),
  ]);

  await exec('pnpm', 'install', '--offline');

  return {
    result: 'apply',
  };
};

export const tryMigrateToPnpmFile: PatchFunction = async (config) => {
  try {
    return await migrateToPnpmFile(config);
  } catch (err) {
    log.warn('Failed to migrate to `.pnpmfile.cjs`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
