import { handleCliError } from '../utils/error';
import { getSkubaVersion } from '../utils/version';

const version = async () => {
  const skubaVersion = await getSkubaVersion();

  console.log(skubaVersion);
};

version().catch(handleCliError);
