import type { DependencySet } from '../types.js';

const DEV_DEPENDENCIES = [
  // replaced
  '@seek/seek-module-toolkit',
  'eslint-config-seek',
  'nodemon',
  'ts-node-dev',
  'tslint-config-seek',
  'tslint',

  // bundled
  '@vitest/coverage-istanbul',
  '@vitest/coverage-v8',
  '@vitest/ui',
  'concurrently',
  'eslint-config-skuba',
  'eslint',
  'prettier',
  'semantic-release',
  'tsconfig-seek',
  'tsx',
  'typescript',
  'vitest',
] as const;

export const skubaDeps = ({ dependencies, devDependencies }: DependencySet) => {
  DEV_DEPENDENCIES.forEach((dep) => {
    delete dependencies[dep];
    delete devDependencies[dep];
  });

  return [];
};
