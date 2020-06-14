import { replacePackageReferences } from '../processing/module';
import { DependencySet } from '../types';

const OLD_NAME = '@seek/node-datadog-custom-metrics';
const NEW_NAME = 'seek-datadog-custom-metrics';

export const seekDatadogCustomMetrics = ({
  dependencies,
  devDependencies,
}: DependencySet) => {
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
        repoSlug: 'seek-jobs/node-datadog-custom-metrics',
      },
      new: {
        packageName: NEW_NAME,
        repoSlug: 'seek-oss/datadog-custom-metrics',
      },
    }),
  ];
};
