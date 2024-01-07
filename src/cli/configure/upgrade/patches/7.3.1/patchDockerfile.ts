import { inspect } from 'util';

import fs from 'fs-extra';

import { log } from '../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../configure/analysis/project';

const DOCKERFILE_FILENAME = 'Dockerfile';

const VERSION_REGEX = /gcr.io\/distroless\/nodejs:(16|18|20)/g;
const VERSION_DEBIAN_REPLACE = 'gcr.io/distroless/nodejs$1-debian11';

const patchDockerfile = async (dir: string) => {
  const readFile = createDestinationFileReader(dir);

  const maybeDockerfile = await readFile(DOCKERFILE_FILENAME);

  if (!maybeDockerfile) {
    return;
  }

  const patched = maybeDockerfile.replaceAll(
    VERSION_REGEX,
    VERSION_DEBIAN_REPLACE,
  );

  await fs.promises.writeFile(DOCKERFILE_FILENAME, patched);
};

export const tryPatchDockerfile = async (dir = process.cwd()) => {
  try {
    await patchDockerfile(dir);
  } catch (err) {
    log.warn('Failed to patch Dockerfile.');
    log.subtle(inspect(err));
  }
};
