import { isBabelFromManifest } from '../../utils/manifest';

import { babel } from './babel';
import { tsc } from './tsc';

export const build = async () => {
  const isBabel = await isBabelFromManifest();

  return isBabel ? babel() : tsc();
};
