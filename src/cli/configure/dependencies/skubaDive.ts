import { replacePackageReferences } from '../processing/module.js';
import type { DependencySet } from '../types.js';

const OLD_NAME = '@seek/skuba-dive';
const NEW_NAME = 'skuba-dive';

export const SKUBA_DIVE_HOOKS = ['module-alias', 'source-map-support'] as const;

export const skubaDive = ({
  dependencies,
  devDependencies,
  type,
}: DependencySet) => {
  SKUBA_DIVE_HOOKS.forEach((hook) => {
    delete dependencies[hook];
    delete devDependencies[hook];
  });

  // skuba-dive is a runtime component; it's not appropriate for packages
  if (type === 'package') {
    delete dependencies[NEW_NAME];
    delete devDependencies[NEW_NAME];
    delete dependencies[OLD_NAME];
    delete devDependencies[OLD_NAME];

    return [];
  }

  dependencies[NEW_NAME] =
    dependencies[NEW_NAME] || devDependencies[NEW_NAME] || '*';
  delete devDependencies[NEW_NAME];

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
