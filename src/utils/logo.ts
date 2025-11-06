import { styleText } from 'node:util';

import { log } from './logging.js';
import { detectPackageManager } from './packageManager.js';
import { getSkubaVersionInfo } from './version.js';

const LOGO = styleText('blueBright', `
    ╭─╮ ${styleText('magentaBright', '    ')}╭─╮
╭───│ ╰─${styleText('magentaBright', '╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${styleText('magentaBright', '│ ╵ │')} • │ • │
╰───╰─┴─${styleText('magentaBright', '╰───╯')}───╯── ╰
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
    log.warn(
      log.bold(`${packageManager.print.update} skuba@${versionInfo.latest}`),
    );
    log.newline();
  }

  return versionInfo;
};
