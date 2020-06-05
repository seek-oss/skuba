import { deleteFiles } from '../processing/deleteFiles';
import { createDependencyFilter, withPackage } from '../processing/package';
import { Module } from '../types';

const filterDevDependencies = createDependencyFilter(
  ['tslint', 'tslint-config-seek'],
  'devDependencies',
);

export const tslintModule = async (): Promise<Module> =>
  Promise.resolve({
    ...deleteFiles('tslint.json', 'tslint.yaml'),

    'package.json': withPackage(filterDevDependencies),
  });
