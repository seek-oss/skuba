import fs from 'fs-extra';

import type { ProjectType } from '../../utils/manifest';
import { getDestinationManifest } from '../configure/analysis/package';
import { formatPackage } from '../configure/processing/package';

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

  await fs.promises.writeFile(manifest.path, updatedPackageJson);
};
