import { isBabelFromManifest } from '../../utils/manifest.js';

import { babel } from './babel.js';
import { tsc } from './tsc.js';

export const build = async () => {
  const isBabel = await isBabelFromManifest();

  return isBabel ? babel() : tsc();
};
