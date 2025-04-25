import path from 'node:path';

import fs from 'fs-extra';

import type { ProjectType } from '../../config/types';
import { getSkubaConfigTsVersionLines } from '../../config/update';
import { formatPrettier } from '../configure/processing/prettier';

interface WriteSkubaConfigProps {
  cwd: string;
  entryPoint?: string;
  template: string;
  type?: ProjectType;
  version: string;
}

/**
 * Write a `skuba` section into the destination `package.json`.
 */
export const writeSkubaConfig = async ({
  cwd,
  entryPoint,
  template,
  type,
  version,
}: WriteSkubaConfigProps) => {
  const contents = [
    "import type { SkubaConfig } from 'skuba/config';",
    '',
    getSkubaConfigTsVersionLines(version).trim(),
    '',
    'const config: SkubaConfig = {',
    ...(entryPoint ? [`  entryPoint: '${entryPoint}',`] : []),
    ...(type ? [`  projectType: '${type}',`] : []),
    `  template: '${template}',`,
    '};',
    '',
    'export default config;',
  ];

  const updatedPackageJson = await formatPrettier(contents.join('\n'), {
    filepath: 'skuba.config.ts',
  });

  await fs.promises.writeFile(
    path.join(cwd, 'skuba.config.ts'),
    updatedPackageJson,
  );
};
