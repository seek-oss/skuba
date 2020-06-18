import { DependencySet } from '../types';

const DEV_DEPENDENCIES = [
  // replaced
  '@seek/seek-module-toolkit',
  'nodemon',

  // bundled
  '@types/jest',
  'concurrently',
  'eslint',
  'eslint-config-seek',
  'jest',
  'prettier',
  'ts-jest',
  'ts-node',
  'ts-node-dev',
  'tsconfig-seek',
  'typescript',
] as const;

export const skubaDeps = ({ devDependencies }: DependencySet) => {
  DEV_DEPENDENCIES.forEach((dep) => {
    delete devDependencies[dep];
  });

  return [];
};
