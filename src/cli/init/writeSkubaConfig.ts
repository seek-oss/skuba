import path from 'node:path';

import fs from 'fs-extra';

import type { SkubaConfig } from '../../config/types';
import { getSkubaConfigTsVersionLines } from '../../config/update';
import { formatPrettier } from '../configure/processing/prettier';

interface WriteSkubaConfigProps {
  config: SkubaConfig;
  cwd: string;
  version: string;
}

/**
 * Write a `skuba` section into the destination `package.json`.
 */
export const writeSkubaConfig = async ({
  config,
  cwd,
  version,
}: WriteSkubaConfigProps) => {
  const contents = [
    "import type { SkubaConfig } from 'skuba/config';",
    '',
    getSkubaConfigTsVersionLines(version).trim(),
    '',
    'const config: SkubaConfig = {',
    ...Object.entries(config)
      .filter(([, value]) => value !== undefined)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => `"${key}": ${JSON.stringify(value)},`),
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
