// Adapted from https://github.com/changesets/action/blob/21240c3cd1d2efa2672d64e0235a03cf139b83e6/src/utils.ts

import { exec } from 'utils/exec';

import { execWithOutput } from './utils';

const getBotName = () => 'buildkite';

export const setupUser = async () => {
  await exec('git', ...['config', '--global', 'user.name', getBotName()]);
  await exec(
    'git',
    ...[
      'config',
      '--global',
      'user.email',
      `${getBotName()}@users.noreply.github.com`,
    ],
  );
};

export const pullBranch = async (branch: string) => {
  await exec('git', ...['pull', 'origin', branch]);
};

export const push = async (
  branch: string,
  { force }: { force?: boolean } = {},
) => {
  await exec(
    'git',
    ...['push', 'origin', `HEAD:${branch}`, force && '--force'].filter<string>(
      Boolean as any,
    ),
  );
};

export const pushTags = async () => {
  await exec('git', ...['push', 'origin', '--tags']);
};

export const switchToMaybeExistingBranch = async (branch: string) => {
  const { stderr } = await execWithOutput('git', ['checkout', branch], {
    ignoreReturnCode: true,
  });
  const isCreatingBranch = !(stderr as Error)
    .toString()
    .includes(`Switched to a new branch '${branch}'`);
  if (isCreatingBranch) {
    await exec('git', ...['checkout', '-b', branch]);
  }
};

export const reset = async (
  pathSpec: string,
  mode: 'hard' | 'soft' | 'mixed' = 'hard',
) => {
  await exec('git', ...['reset', `--${mode}`, pathSpec]);
};

export const commitAll = async (message: string) => {
  await exec('git', ...['add', '.']);
  await exec('git', ...['commit', '-m', message]);
};

export const checkIfClean = async (): Promise<boolean> => {
  const { stdout } = await execWithOutput('git', ['status', '--porcelain']);
  return !(stdout as Array<unknown>).length;
};
