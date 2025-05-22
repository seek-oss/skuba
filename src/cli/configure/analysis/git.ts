import fs from 'fs-extra';

import { crawlDirectory } from '../../../utils/dir';
import { log } from '../../../utils/logging';

export const auditWorkingTree = async (dir: string) => {
  const filepaths = await crawlDirectory(dir);

  let anyFailed = false;

  const git = await import('isomorphic-git');

  const statuses = await Promise.all(
    filepaths.map(async (filepath) => {
      try {
        return await git.status({ dir, fs, filepath });
      } catch {
        // TODO: Why does isomorphic-git sometimes just _fail_?
        anyFailed = true;
        return 'absent';
      }
    }),
  );

  if (
    statuses.some(
      (status) =>
        status !== 'absent' && status !== 'ignored' && status !== 'unmodified',
    )
  ) {
    log.newline();
    log.warn('You have dirty/untracked files that may be overwritten.');
  } else if (anyFailed) {
    log.newline();
    log.warn(
      "Some files failed to be read. Check that you don't have any dirty/untracked files that may be overwritten.",
    );
  }
};
