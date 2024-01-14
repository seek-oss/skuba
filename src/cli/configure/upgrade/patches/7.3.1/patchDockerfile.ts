import { inspect } from 'util';

import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../utils/logging';
import { createDestinationFileReader } from '../../../analysis/project';

const DOCKERFILE_FILENAME = 'Dockerfile';

const NON_DEBIAN_REGEX = /gcr.io\/distroless\/nodejs:(18|20)/g;
const DEBIAN_REGEX = /gcr.io\/distroless\/nodejs(18|20)-debian11/g;
const VERSION_DEBIAN_REPLACE = 'gcr.io/distroless/nodejs$1-debian12';

const patchDockerfile = async (
  mode: 'format' | 'lint',
  dir: string,
): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);

  const maybeDockerfile = await readFile(DOCKERFILE_FILENAME);

  if (!maybeDockerfile) {
    return { result: 'skip', reason: 'no Dockerfile found' };
  }

  const patched = maybeDockerfile
    .replaceAll(NON_DEBIAN_REGEX, VERSION_DEBIAN_REPLACE)
    .replaceAll(DEBIAN_REGEX, VERSION_DEBIAN_REPLACE);

  if (patched === maybeDockerfile) {
    return { result: 'skip' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await fs.promises.writeFile(DOCKERFILE_FILENAME, patched);

  return { result: 'apply' };
};

export const tryPatchDockerfile: PatchFunction = async (
  mode: 'format' | 'lint',
  dir = process.cwd(),
) => {
  try {
    return await patchDockerfile(mode, dir);
  } catch (err) {
    log.warn('Failed to patch Dockerfile.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
