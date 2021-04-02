import chalk from 'chalk';
import isInstalledGlobally from 'is-installed-globally';

import { log } from './logging.js';
import { getSkubaVersionInfo } from './version.js';

const LOGO = chalk.blueBright(`
    ╭─╮ ${chalk.magentaBright('    ')}╭─╮
╭───│ ╰─${chalk.magentaBright('╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${chalk.magentaBright('│ ╵ │')} • │ • │
╰───╰─┴─${chalk.magentaBright('╰───╯')}───╯── ╰
`);

export const showLogoAndVersionInfo = async () => {
  const versionInfo = await getSkubaVersionInfo();

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
    log.warn(
      log.bold(
        'yarn',
        ...(isInstalledGlobally ? ['global'] : []),
        'upgrade',
        `skuba@${versionInfo.latest}`,
      ),
    );
    log.newline();
  }

  return versionInfo;
};
