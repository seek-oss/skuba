import path from 'path';

import chalk, { type Color } from 'chalk';
import fs from 'fs-extra';

import { copyFile } from '../../utils/copy';
import { buildPatternToFilepathMap, crawlDirectory } from '../../utils/dir';
import { type Logger, createLogger, log } from '../../utils/logging';
import {
  getConsumerManifest,
  getEntryPointFromManifest,
  getPropFromConsumerManifest,
} from '../../utils/manifest';

export const copyAssets = async (
  destinationDir: string,
  logger: Logger = log,
) => {
  const manifest = await getConsumerManifest();
  if (!manifest) {
    return;
  }

  const assets = await getPropFromConsumerManifest<string, string[]>('assets');
  if (!assets) {
    return;
  }

  const entryPoint = await getEntryPointFromManifest();
  if (!entryPoint) {
    return;
  }

  const pathSegments = entryPoint.split(path.sep);
  const srcDir = (pathSegments.length > 1 && pathSegments[0]) || '';
  const resolvedSrcDir = path.resolve(path.dirname(manifest.path), srcDir);
  const resolvedDestinationDir = path.resolve(
    path.dirname(manifest.path),
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
        createLogger(
          false,
          chalk[prefixColor](`${name.padEnd(maxNameLength)} │`),
        ),
      ),
    ),
  );
};
