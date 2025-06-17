import { replacePackageReferences } from '../processing/module.js';
import type { DependencySet } from '../types.js';

const OLD_NAME = '@seek/skuba';
const NEW_NAME = 'skuba';

export const skuba = ({ dependencies, devDependencies }: DependencySet) => {
  // force latest dev dependency
  devDependencies[NEW_NAME] = '*';
  delete dependencies[NEW_NAME];

  if (!dependencies[OLD_NAME] && !devDependencies[OLD_NAME]) {
    return [];
  }

  delete dependencies[OLD_NAME];
  delete devDependencies[OLD_NAME];

  return [
    replacePackageReferences({
      old: {
        packageName: OLD_NAME,
        repoSlug: 'seek-jobs/skuba',
      },
      new: {
        packageName: NEW_NAME,
        repoSlug: 'seek-oss/skuba',
      },
    }),
  ];
};
