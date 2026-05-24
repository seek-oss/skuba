import { readPackageUp } from 'read-package-up';

import { log } from '../../../utils/logging.js';
import type { ReadResult } from '../types.js';

interface GetDestinationManifestProps {
  cwd?: string;
}

export const getDestinationManifest = async (
  props?: GetDestinationManifestProps,
): Promise<ReadResult> => {
  const result = await readPackageUp({ ...props, normalize: false });

  if (result === undefined) {
    log.err(
      'Could not find a',
      log.bold('package.json'),
      'in your working directory.',
    );
    process.exit(1);
  }

  return result;
};
