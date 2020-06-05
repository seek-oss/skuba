import fs from 'fs-extra';

import { getDestinationManifest } from '../configure/analysis/package';
import { formatPackage } from '../configure/processing/package';

interface WritePackageJsonProps {
  cwd: string;
  entryPoint?: string;
  template: string;
  version: string;
}

/**
 * Write a `skuba` section into the destination `package.json`.
 */
export const writePackageJson = async ({
  cwd,
  entryPoint,
  template,
  version,
}: WritePackageJsonProps) => {
  const manifest = await getDestinationManifest({ cwd });

  manifest.packageJson.skuba = {
    entryPoint: entryPoint ?? null,
    template,
    version,
  };

  const updatedPackageJson = formatPackage(manifest.packageJson);

  await fs.writeFile(manifest.path, updatedPackageJson);
};
