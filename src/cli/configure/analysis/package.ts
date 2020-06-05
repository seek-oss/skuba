import chalk from 'chalk';
import readPkgUp from 'read-pkg-up';

import { createExec } from '../../../utils/exec';

interface GetDestinationManifestProps {
  cwd?: string;
}

export const getDestinationManifest = async (
  props?: GetDestinationManifestProps,
) => {
  const result = await readPkgUp(props);

  if (typeof result === 'undefined') {
    console.error(
      chalk.red(
        `Could not locate a ${chalk.bold(
          'package.json',
        )} in your working directory.`,
      ),
    );
    process.exit(1);
  }

  return result;
};

export const getPackageVersion = async (name: string) => {
  const exec = createExec({ stdio: 'pipe' });

  try {
    const { stdout } = await exec(
      'yarn',
      'info',
      '--no-progress',
      '--silent',
      name,
      'version',
    );

    // Yarn unhelpfully emits these ANSI control codes
    return stdout.replace(/^\u001b\[2K\u001b\[1G/, '');
  } catch (err) {
    console.error(chalk.red(err));

    return '*';
  }
};
