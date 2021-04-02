import { hasDebugFlag } from '../utils/args.js';
import { exec } from '../utils/exec.js';
import { log } from '../utils/logging.js';

export const format = async () => {
  const debug = hasDebugFlag();

  await exec(
    'eslint',
    ...(debug ? ['--debug'] : []),
    '--ext=js,ts,tsx',
    '--fix',
    '.',
  );
  log.ok('✔ ESLint');

  await exec(
    'prettier',
    ...(debug ? ['--loglevel', 'debug'] : []),
    '--write',
    '.',
  );
  log.ok('✔ Prettier');
};
