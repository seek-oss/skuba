import { createExec } from '../../../utils/exec';
import { log } from '../../../utils/logging';

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

    log.newline();
    log.warn('You have', fileTypes, 'files that may be overwritten.');
  }
};
