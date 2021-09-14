import { hasDebugFlag } from '../utils/args';
import { exec } from '../utils/exec';
import { log } from '../utils/logging';

export const format = async () => {
  const debug = hasDebugFlag();

  await exec(
    'eslint',
    ...(debug ? ['--debug'] : []),
    '--ext=js,ts,tsx',
    '--fix',
    '--report-unused-disable-directives',
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
