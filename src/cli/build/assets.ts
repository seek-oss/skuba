import path from 'path';

import fs from 'fs-extra';

import { copyFile } from '../../utils/copy';
import { buildPatternToFilepathMap, crawlDirectory } from '../../utils/dir';
import { type Logger, log } from '../../utils/logging';
import {
  getConsumerManifest,
  getPropFromConsumerManifest,
} from '../../utils/manifest';

export const copyAssets = async (
  destinationDir: string,
  logger: Logger = log,
) => {
  const manifest = await getConsumerManifest();
  const assets = await getPropFromConsumerManifest<string[]>('assets');

  if (!manifest || !assets) {
    return;
  }

  const resolvedSrcDir = path.resolve(path.dirname(manifest.path), 'src');
  const resolvedDestinationDir = path.resolve(
    path.dirname(manifest.path),
    destinationDir,
  );
  const allFiles = await crawlDirectory(resolvedSrcDir);
  const filesByPattern = buildPatternToFilepathMap(assets, allFiles, {
    cwd: resolvedSrcDir,
    dot: true,
  });

  for (const filenames of Object.values(filesByPattern)) {
    await Promise.all(
      filenames.map(async (filename) => {
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
  }
};
