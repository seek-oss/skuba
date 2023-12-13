import chalk from 'chalk';

import { log } from './logging';
import { detectPackageManager } from './packageManager';
import { getSkubaVersionInfo } from './version';

const LOGO = chalk.blueBright(`
    ╭─╮ ${chalk.magentaBright('    ')}╭─╮
╭───│ ╰─${chalk.magentaBright('╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${chalk.magentaBright('│ ╵ │')} • │ • │
╰───╰─┴─${chalk.magentaBright('╰───╯')}───╯── ╰
`);

export const showLogoAndVersionInfo = async () => {
  const [versionInfo, packageManager] = await Promise.all([
    getSkubaVersionInfo(),
    detectPackageManager(),
  ]);

  log.plain(LOGO);
  log.subtle(
    log.bold(versionInfo.local),
    '|',
    'latest',
    log.bold(versionInfo.latest ?? 'offline ✈'),
  );
  log.newline();

  if (versionInfo.isStale) {
    log.warn('Your skuba installation is out of date.');
    log.warn('Consider upgrading:');
    log.newline();
    log.warn(log.bold(packageManager.update, `skuba@${versionInfo.latest}`));
    log.newline();
  }

  return versionInfo;
};
