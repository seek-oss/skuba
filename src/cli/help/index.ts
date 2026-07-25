import { showHelp } from '../../utils/help.ts';
import { showLogoAndVersionInfo } from '../../utils/logo.ts';

export const help = async (args = process.argv.slice(2)) => {
  await showLogoAndVersionInfo();

  // `skuba help <command>` leaves the command as the sole remaining argument.
  await showHelp(args[0]);
};
