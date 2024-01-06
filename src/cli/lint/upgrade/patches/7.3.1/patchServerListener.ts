import { inspect } from 'util';

import fs from 'fs-extra';

import { log } from '../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../configure/analysis/project';
import { formatPrettier } from '../../../../configure/processing/prettier';

const SERVER_LISTENER_FILENAME = 'src/listen.ts';

const KEEP_ALIVE_CODE = `
// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;
`;

const patchServerListener = async (dir: string) => {
  const readFile = createDestinationFileReader(dir);

  let listener = await readFile(SERVER_LISTENER_FILENAME);

  if (!listener || listener.includes('keepAliveTimeout')) {
    return;
  }

  if (listener.includes('\napp.listen(')) {
    listener = listener.replace(
      '\napp.listen(',
      '\nconst listener = app.listen(',
    );
  }

  if (!listener.includes('\nconst listener = app.listen(')) {
    return;
  }

  listener = `${listener}${KEEP_ALIVE_CODE}`;

  await fs.promises.writeFile(
    SERVER_LISTENER_FILENAME,
    await formatPrettier(listener, {
      parser: 'typescript',
    }),
  );
};

export const tryPatchServerListener = async (dir = process.cwd()) => {
  try {
    await patchServerListener(dir);
  } catch (err) {
    log.warn('Failed to patch server listener.');
    log.subtle(inspect(err));
  }
};
