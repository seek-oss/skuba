import { deleteFiles } from '../processing/deleteFiles';
import { createDependencyFilter, withPackage } from '../processing/package';
import { Module } from '../types';

const filterDevDependencies = createDependencyFilter(
  ['nodemon'],
  'devDependencies',
);

export const nodemonModule = async (): Promise<Module> =>
  Promise.resolve({
    ...deleteFiles('nodemon.json'),

    'package.json': withPackage(filterDevDependencies),
  });
