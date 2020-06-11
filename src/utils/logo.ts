import chalk from 'chalk';

import { log } from './logging';
import { getSkubaVersion } from './version';

const LOGO = chalk.blueBright(`
    ╭─╮ ${chalk.magentaBright('    ')}╭─╮
╭───│ ╰─${chalk.magentaBright('╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${chalk.magentaBright('│ ╵ │')} • │ • │
╰───╰─┴─${chalk.magentaBright('╰───╯')}───╯── ╰
`);

export const showLogo = async () => {
  const skubaVersion = await getSkubaVersion();

  log.plain(LOGO);
  log.subtle(skubaVersion);
  log.newline();

  return skubaVersion;
};
