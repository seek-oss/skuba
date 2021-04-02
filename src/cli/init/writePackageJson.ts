import fs from 'fs-extra';

import { ProjectType } from '../../utils/manifest.js';
import { getDestinationManifest } from '../configure/analysis/package.js';
import { formatPackage } from '../configure/processing/package.js';

interface WritePackageJsonProps {
  cwd: string;
  entryPoint?: string;
  template: string;
  type?: ProjectType;
  version: string;
}

/**
 * Write a `skuba` section into the destination `package.json`.
 */
export const writePackageJson = async ({
  cwd,
  entryPoint,
  template,
  type,
  version,
}: WritePackageJsonProps) => {
  const manifest = await getDestinationManifest({ cwd });

  manifest.packageJson.skuba = {
    entryPoint: entryPoint ?? null,
    template,
    type,
    version,
  };

  const updatedPackageJson = formatPackage(manifest.packageJson);

  await fs.writeFile(manifest.path, updatedPackageJson);
};
