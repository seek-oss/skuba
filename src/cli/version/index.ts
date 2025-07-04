import { log } from '../../utils/logging.js';
import { getSkubaVersion } from '../../utils/version.js';

export const version = async () => {
  const skubaVersion = await getSkubaVersion();

  log.plain(skubaVersion);
};
