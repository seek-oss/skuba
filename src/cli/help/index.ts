import { showHelp } from '../../utils/help.js';
import { showLogoAndVersionInfo } from '../../utils/logo.js';

export const help = async () => {
  await showLogoAndVersionInfo();

  showHelp();
};
