import path from 'path';

import fs from 'fs-extra';

import type { ProjectType } from '../../config/types';
import { log } from '../../utils/logging';
import type { PackageManagerConfig } from '../../utils/packageManager';

import { diffFiles } from './analysis/project';

interface Props {
  destinationRoot: string;
  entryPoint: string;
  firstRun: boolean;
  packageManager: PackageManagerConfig;
  type: ProjectType;
}

export const analyseConfiguration = async (
  props: Props,
): Promise<undefined | (() => Promise<void>)> => {
  log.newline();
  log.plain(log.bold('Config:'));

  const files = await diffFiles(props);

  if (Object.keys(files).length === 0) {
    log.newline();
    log.ok('✔ No changes');
    return;
  }

  log.newline();
  Object.entries(files)
    .sort(([filenameA], [filenameB]) => filenameA.localeCompare(filenameB))
    .forEach(([filename, { operation }]) => log.plain(operation, filename));

  return async () => {
    const dirnames = [
      ...new Set(Object.keys(files).map((filename) => path.dirname(filename))),
    ];

    await Promise.all(
      dirnames.map((dirname) =>
        fs.promises.mkdir(dirname, { recursive: true }),
      ),
    );

    await Promise.all(
      Object.entries(files).map(([filename, { data }]) =>
        data === undefined
          ? fs.promises.rm(filename)
          : fs.promises.writeFile(filename, data),
      ),
    );
  };
};
