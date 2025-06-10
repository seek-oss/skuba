import { log } from '../../utils/logging';
import { getSkubaVersion } from '../../utils/version';

export const version = async () => {
  const skubaVersion = await getSkubaVersion();

  log.plain(skubaVersion);
};
