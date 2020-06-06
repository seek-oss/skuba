import { showHelp } from '../utils/help';
import { showLogo } from '../utils/logo';

export const help = async () => {
  await showLogo();

  showHelp();
};
