import fs from 'fs-extra';
import git from 'isomorphic-git';

import { crawlDirectory } from '../../../utils/dir';
import { log } from '../../../utils/logging';

export const auditWorkingTree = async (dir: string) => {
  const filepaths = await crawlDirectory(dir);

  const statuses = await Promise.all(
    filepaths.map((filepath) => git.status({ dir, fs, filepath })),
  );

  if (
    statuses.some(
      (status) =>
        status !== 'absent' && status !== 'ignored' && status !== 'unmodified',
    )
  ) {
    log.newline();
    log.warn('You have dirty/untracked files that may be overwritten.');
  }
};
