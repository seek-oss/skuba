import { join } from 'path';

import fs from 'fs-extra';

import { globFiles } from '../../../utils/glob.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';

const LAYER_VERSION_PATTERNS = [
  /\b(?<prefix>DATADOG_NODE_LAYER_VERSION(?:\s*:\s*number)?\s*=\s*)(?<version>\d+)\b/g,
  /\b(?<prefix>nodeLayerVersion\s*:\s*)(?<version>\d+)\b/g,
];

export const patchDatadogNodeLayerVersion = (
  contents: string,
  layerVersion: number,
) =>
  LAYER_VERSION_PATTERNS.reduce(
    (patched, pattern) =>
      patched.replace(pattern, (match, prefix: string, version: string) =>
        Number(version) < layerVersion ? `${prefix}${layerVersion}` : match,
      ),
    contents,
  );

export const upgradeDatadogNodeLayerVersion = async (
  dir: string,
  layerVersion: number,
) => {
  const readFile = createDestinationFileReader(dir);
  const paths = await globFiles('**/*.ts', {
    cwd: dir,
    exclude: ['**/node_modules/**'],
  });

  await Promise.all(
    paths.map(async (filePath) => {
      const contents = await readFile(filePath);
      if (!contents) {
        return;
      }

      const patched = patchDatadogNodeLayerVersion(contents, layerVersion);

      if (patched !== contents) {
        await fs.promises.writeFile(join(dir, filePath), patched);
      }
    }),
  );
};
