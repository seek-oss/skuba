import type { DependencySet } from '../types';

const DEV_DEPENDENCIES = [
  // replaced
  '@seek/seek-module-toolkit',
  'eslint-config-seek',
  'nodemon',
  'ts-node-dev',
  'tslint-config-seek',
  'tslint',

  // bundled
  '@types/jest',
  'concurrently',
  'eslint-config-skuba',
  'eslint',
  'jest',
  'prettier',
  'ts-jest',
  'ts-node',
  'tsconfig-seek',
  'tsx',
  'typescript',
] as const;

export const skubaDeps = ({ dependencies, devDependencies }: DependencySet) => {
  DEV_DEPENDENCIES.forEach((dep) => {
    delete dependencies[dep];
    delete devDependencies[dep];
  });

  return [];
};
