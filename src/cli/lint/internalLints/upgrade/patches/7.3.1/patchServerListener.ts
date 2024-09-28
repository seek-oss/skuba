import { inspect } from 'util';

import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';
import { createDestinationFileReader } from '../../../../../configure/analysis/project';
import { formatPrettier } from '../../../../../configure/processing/prettier';

const SERVER_LISTENER_FILENAME = 'src/listen.ts';

const KEEP_ALIVE_CODE = `
// Gantry ALB default idle timeout is 30 seconds
// https://nodejs.org/docs/latest-v20.x/api/http.html#serverkeepalivetimeout
// Node default is 5 seconds
// https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout
// AWS recommends setting an application timeout larger than the load balancer
listener.keepAliveTimeout = 31000;
`;

const patchServerListener = async (
  mode: 'format' | 'lint',
  dir: string,
): Promise<PatchReturnType> => {
  const readFile = createDestinationFileReader(dir);

  let listener = await readFile(SERVER_LISTENER_FILENAME);
  if (!listener) {
    return { result: 'skip', reason: 'no listener file found' };
  }

  if (listener.includes('keepAliveTimeout')) {
    return { result: 'skip', reason: 'keepAliveTimeout already configured' };
  }

  if (listener.includes('\napp.listen(')) {
    listener = listener.replace(
      '\napp.listen(',
      '\nconst listener = app.listen(',
    );
  }

  if (!listener.includes('\nconst listener = app.listen(')) {
    return { result: 'skip', reason: 'no server listener found' };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  listener = `${listener}${KEEP_ALIVE_CODE}`;

  await fs.promises.writeFile(
    SERVER_LISTENER_FILENAME,
    await formatPrettier(listener, {
      parser: 'typescript',
    }),
  );

  return { result: 'apply' };
};

export const tryPatchServerListener: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}) => {
  try {
    return await patchServerListener(mode, dir);
  } catch (err) {
    log.warn('Failed to patch server listener.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
