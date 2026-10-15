import fs from 'fs-extra';

import type { ProjectType } from '../../utils/manifest.ts';
import { getDestinationManifest } from '../configure/analysis/package.ts';
import { formatPackage } from '../configure/processing/package.ts';

interface WritePackageJsonProps {
  cwd: string;
  entryPoint?: string;
  template: string;
  type?: ProjectType;
  version: string;
}

export interface SkubaPackageJson {
  entryPoint: string | null;
  template: string;
  type?: string;
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
  } satisfies SkubaPackageJson;

  const updatedPackageJson = await formatPackage(manifest.packageJson);

  await fs.promises.writeFile(manifest.path, updatedPackageJson);
};
