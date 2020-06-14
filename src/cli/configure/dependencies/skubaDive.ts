import { replacePackageReferences } from '../processing/module';
import { DependencySet } from '../types';

const OLD_NAME = '@seek/skuba-dive';
const NEW_NAME = 'skuba-dive';

export const skubaDive = ({ dependencies, devDependencies }: DependencySet) => {
  // lazily upgrade to latest version of the new package
  if (dependencies[OLD_NAME]) {
    dependencies[NEW_NAME] = '*';
  }
  if (devDependencies[OLD_NAME]) {
    devDependencies[NEW_NAME] = '*';
  }

  // ensure dependency
  if (devDependencies[NEW_NAME]) {
    dependencies[NEW_NAME] =
      dependencies[NEW_NAME] || devDependencies[NEW_NAME];
    delete devDependencies[NEW_NAME];
  }

  if (!dependencies[OLD_NAME] && !devDependencies[OLD_NAME]) {
    return [];
  }

  delete dependencies[OLD_NAME];
  delete devDependencies[OLD_NAME];

  return [
    replacePackageReferences({
      old: {
        packageName: OLD_NAME,
        repoSlug: 'seek-jobs/skuba-dive',
      },
      new: {
        packageName: NEW_NAME,
        repoSlug: 'seek-oss/skuba-dive',
      },
    }),
  ];
};
