import chalk from 'chalk';

import { createExec } from '../../../utils/exec';

export const auditWorkingTree = async () => {
  const exec = createExec({ stdio: 'pipe' });

  const [diff, status] = await Promise.all([
    exec('git', 'diff', '--stat'),
    exec('git', 'status', '--short'),
  ]);

  const workingTree = {
    dirty: Boolean(diff.stdout),
    untracked: Boolean(status.stdout),
  };

  if (workingTree.dirty || workingTree.untracked) {
    const fileTypes = Object.entries(workingTree)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join('/');

    console.error(
      chalk.yellow(`You have ${fileTypes} files that may be overwritten.`),
    );
    console.log();
  }
};
