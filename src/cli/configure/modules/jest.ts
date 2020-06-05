import { readBaseTemplateFile } from '../../../utils/template';
import { loadFiles } from '../processing/loadFiles';
import { withPackage } from '../processing/package';
import { Module } from '../types';

export const jestModule = async (): Promise<Module> => {
  const [configFile, setupFile] = await Promise.all([
    readBaseTemplateFile('jest.config.js'),
    readBaseTemplateFile('jest.setup.ts'),
  ]);

  return {
    ...loadFiles('jest.setup.ts'),

    'jest.config.js': (inputFile, files) => {
      // allow customised Jest configs that extend skuba
      if (inputFile?.includes('skuba/config/jest')) {
        return inputFile;
      }

      files['jest.setup.ts'] = files['jest.setup.ts'] ?? setupFile;

      return configFile;
    },

    'package.json': withPackage(({ jest, ...data }) => data),
  };
};
