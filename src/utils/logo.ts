import chalk from 'chalk';

import { getSkubaVersion } from './version';

const LOGO = chalk.blueBright(`
    ╭─╮ ${chalk.magentaBright('    ')}╭─╮
╭───│ ╰─${chalk.magentaBright('╭─┬─╮')} ╰─╮───╮
│_ ─┤  <${chalk.magentaBright('│ ╵ │')} • │ • │
╰───╰─┴─${chalk.magentaBright('╰───╯')}───╯── ╰
`);

export const showLogo = async () => {
  const skubaVersion = await getSkubaVersion();

  console.log(LOGO);
  console.log(chalk.grey(skubaVersion));
  console.log();

  return skubaVersion;
};
