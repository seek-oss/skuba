import path from 'path';

import fs from 'fs-extra';

import { copyFile } from '../../utils/copy.ts';
import { buildPatternToFilepathMap, crawlDirectory } from '../../utils/dir.ts';
import { type Logger, log } from '../../utils/logging.ts';
import {
  getEntryPointFromManifest,
  getManifestProperties,
} from '../../utils/manifest.ts';

export const copyAssets = async (
  destinationDir: string,
  logger: Logger = log,
) => {
  const manifest = await getManifestProperties<string, string[]>('assets');

  if (!manifest?.value) {
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
  const filesByPattern = buildPatternToFilepathMap(manifest.value, allFiles, {
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
