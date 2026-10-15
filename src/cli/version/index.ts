import { log } from '../../utils/logging.ts';
import { getSkubaVersion } from '../../utils/version.ts';

export const version = async () => {
  const skubaVersion = await getSkubaVersion();

  log.plain(skubaVersion);
};
