import http from 'http';
import { AddressInfo } from 'net';
import path from 'path';

import chalk from 'chalk';

import { handleCliError } from '../../utils/error';

interface Config {
  // Koa compatibility
  callback?: () => http.RequestListener;

  requestListener?: http.RequestListener;

  port?: number;
}

const isConfig = (data: unknown): data is Config =>
  typeof data === 'object' && data !== null;

const start = () => {
  if (process.argv.length < 4) {
    console.error(chalk.red('Missing arguments: <entry-point> <port>'));
    process.exit(1);
  }

  const entryPoint = process.argv[2];

  const appPath = path.join(process.cwd(), entryPoint);

  /* eslint-disable-next-line @typescript-eslint/no-var-requires */
  const config = require(appPath) as unknown;

  if (!isConfig(config)) {
    console.error(chalk.red(`Invalid export from ${chalk.bold(appPath)}`));
    process.exit(1);
  }

  // assume an executable script with no exports
  if (Object.keys(config).length === 0) {
    return Promise.resolve();
  }

  const availablePort = Number(process.argv[3]) || undefined;

  const port = config.port ?? availablePort;

  const requestListener = config.requestListener ?? config.callback?.();

  if (typeof requestListener === 'undefined') {
    console.error("You must export one of 'callback', 'requestListener'");
    process.exit(1);
  }

  const server = http.createServer(requestListener);

  return new Promise((resolve, reject) =>
    server
      .listen(port)
      .on('close', resolve)
      .on('error', reject)
      .on('listening', () => {
        const address = server.address() as AddressInfo;

        console.debug(`listening on port ${address.port}`);
      }),
  );
};

start().catch(handleCliError);
