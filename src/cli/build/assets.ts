import path from 'path';

import chalk, { type Color } from 'chalk';
import fs from 'fs-extra';

import { loadSkubaConfig } from '../../config/load';
import { copyFile } from '../../utils/copy';
import { buildPatternToFilepathMap, crawlDirectory } from '../../utils/dir';
import { type Logger, createLogger, log } from '../../utils/logging';

export const copyAssets = async (
  destinationDir: string,
  logger: Logger = log,
) => {
  const { entryPoint, assets, configPath } = await loadSkubaConfig();
  if (!assets.length || !configPath) {
    return;
  }

  const pathSegments = entryPoint.split(path.sep);
  const srcDir = (pathSegments.length > 1 && pathSegments[0]) || '';
  const resolvedSrcDir = path.resolve(path.dirname(configPath), srcDir);
  const resolvedDestinationDir = path.resolve(
    path.dirname(configPath),
    destinationDir,
  );

  const allFiles = await crawlDirectory(resolvedSrcDir);
  const filesByPattern = buildPatternToFilepathMap(assets, allFiles, {
    cwd: resolvedSrcDir,
    dot: true,
  });
  const matchedFiles = Array.from(
    new Set(Object.values(filesByPattern).flat()),
  );

  await Promise.all(
    matchedFiles.map(async (filename) => {
      logger.subtle(`Copying ${filename}`);

      await fs.promises.mkdir(
        path.dirname(path.join(resolvedDestinationDir, filename)),
        { recursive: true },
      );
      await copyFile(
        path.join(resolvedSrcDir, filename),
        path.join(resolvedDestinationDir, filename),
        { processors: [] },
      );
    }),
  );
};

interface CopyAssetsConfig {
  outDir: string;
  name: string;
  prefixColor: typeof Color;
}

export const copyAssetsConcurrently = async (configs: CopyAssetsConfig[]) => {
  const maxNameLength = configs.reduce(
    (length, command) => Math.max(length, command.name.length),
    0,
  );

  await Promise.all(
    configs.map(({ outDir, name, prefixColor }) =>
      copyAssets(
        outDir,
        createLogger({
          debug: false,
          prefixes: [chalk[prefixColor](`${name.padEnd(maxNameLength)} │`)],
        }),
      ),
    ),
  );
};
