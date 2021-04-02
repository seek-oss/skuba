import { DependencySet } from '../types.js';

const DEV_DEPENDENCIES = [
  // replaced
  '@seek/seek-module-toolkit',
  'eslint-config-seek',
  'nodemon',
  'tslint',
  'tslint-config-seek',

  // bundled
  '@types/jest',
  'concurrently',
  'eslint',
  'eslint-config-skuba',
  'jest',
  'prettier',
  'semantic-release',
  'ts-jest',
  'ts-node',
  'ts-node-dev',
  'tsconfig-seek',
  'typescript',
] as const;

export const skubaDeps = ({ dependencies, devDependencies }: DependencySet) => {
  DEV_DEPENDENCIES.forEach((dep) => {
    delete dependencies[dep];
    delete devDependencies[dep];
  });

  return [];
};
