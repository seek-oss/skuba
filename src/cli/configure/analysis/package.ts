import readPkgUp from 'read-pkg-up';

import { log } from '../../../utils/logging';

interface GetDestinationManifestProps {
  cwd?: string;
}

export const getDestinationManifest = async (
  props?: GetDestinationManifestProps,
) => {
  const result = await readPkgUp(props);

  if (typeof result === 'undefined') {
    log.err(
      'Could not find a',
      log.bold('package.json'),
      'in your working directory.',
    );
    process.exit(1);
  }

  return result;
};
