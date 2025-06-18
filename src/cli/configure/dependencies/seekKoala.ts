import { replacePackageReferences } from '../processing/module.js';
import type { DependencySet } from '../types.js';

const OLD_NAME = '@seek/koala';
const NEW_NAME = 'seek-koala';

export const seekKoala = ({ dependencies, devDependencies }: DependencySet) => {
  if (!dependencies[OLD_NAME] && !devDependencies[OLD_NAME]) {
    return [];
  }

  // lazily upgrade to latest version of the new package
  if (dependencies[OLD_NAME]) {
    dependencies[NEW_NAME] = '*';
    delete dependencies[OLD_NAME];
  }
  if (devDependencies[OLD_NAME]) {
    devDependencies[NEW_NAME] = '*';
    delete devDependencies[OLD_NAME];
  }

  return [
    replacePackageReferences({
      old: {
        packageName: OLD_NAME,
        repoSlug: 'seek-jobs/koala',
      },
      new: {
        packageName: NEW_NAME,
        repoSlug: 'seek-oss/koala',
      },
    }),
  ];
};
