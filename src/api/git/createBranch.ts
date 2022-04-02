import fs from 'fs-extra';
import git from 'isomorphic-git';

interface BranchParameters {
  dir: string;
  name: string;
  clean?: boolean;
}

export const createBranch = async ({
  dir,
  name,
  clean,
}: BranchParameters): Promise<void> => {
  try {
    await git.branch({
      fs,
      dir,
      ref: name,
      checkout: true,
    });
  } catch (error) {
    if (clean) {
      if (error instanceof git.Errors.AlreadyExistsError) {
        await git.deleteBranch({
          fs,
          dir,
          ref: name,
        });
        await git.branch({
          fs,
          dir,
          ref: name,
          checkout: true,
        });
        return;
      }
    }

    throw error;
  }
};
