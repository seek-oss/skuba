import { getSkubaVersion } from '../utils/version';

export const version = async () => {
  const skubaVersion = await getSkubaVersion();

  console.log(skubaVersion);
};
