import { styleText } from 'node:util';

import { isAgent } from 'std-env';

import { log } from './logging.js';
import { pnpmUpdate } from './packageManager.js';
import { getSkubaVersionInfo } from './version.js';

const LOGO = styleText(
  'blueBright',
  `
    ╭─╮ ${styleText('magentaBright', '    ')}╭─╮
╭───│ ╰─${styleText('magentaBright', '╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${styleText('magentaBright', '│ ╵ │')} • │ • │
╰───╰─┴─${styleText('magentaBright', '╰───╯')}───╯── ╰
`,
);

export const showLogoAndVersionInfo = async () => {
  const versionInfo = await getSkubaVersionInfo();

  if (!isAgent) {
    log.plain(LOGO);
  }

  log.subtle(
    ...(isAgent ? ['skuba'] : []),
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
    log.warn(log.bold(`${pnpmUpdate} skuba@${versionInfo.latest}`));
    log.newline();
  }

  return versionInfo;
};
