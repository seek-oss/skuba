import { handleCliError } from '../utils/error';
import { showHelp } from '../utils/help';
import { showLogo } from '../utils/logo';

const help = async () => {
  await showLogo();

  showHelp();
};

help().catch(handleCliError);
