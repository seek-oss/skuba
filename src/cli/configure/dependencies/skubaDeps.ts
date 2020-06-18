import { DependencySet } from '../types';

const BUNDLED_DEPENDENCIES = [
  '@seek/seek-module-toolkit',
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
  BUNDLED_DEPENDENCIES.forEach((dep) => {
    delete devDependencies[dep];
  });

  return [];
};
