import { showHelp } from '../../utils/help';
import { showLogoAndVersionInfo } from '../../utils/logo';

export const help = async () => {
  await showLogoAndVersionInfo();

  showHelp();
};
