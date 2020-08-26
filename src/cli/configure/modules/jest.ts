import { readBaseTemplateFile } from '../../../utils/template';
import { loadFiles } from '../processing/loadFiles';
import { withPackage } from '../processing/package';
import {
  createPropAppender,
  createPropFilter,
  readModuleExports,
  transformModuleExports,
} from '../processing/typescript';
import { Module } from '../types';

// Jest options to preserve during migration
const filterProps = createPropFilter([
  'collectCoverageFrom',
  'coverageThreshold',
  'globalSetup',
  'globalTeardown',
  'setupFiles',
  'setupFilesAfterEnv',
]);

export const jestModule = async (): Promise<Module> => {
  const [configFile, setupFile] = await Promise.all([
    readBaseTemplateFile('jest.config.js'),
    readBaseTemplateFile('jest.setup.ts'),
  ]);

  return {
    ...loadFiles('jest.setup.ts'),

    'jest.config.js': (inputFile, files) => {
      // allow customised Jest configs that extend skuba
      if (inputFile?.includes('skuba')) {
        return inputFile;
      }

      files['jest.setup.ts'] ??= setupFile;

      const props =
        typeof inputFile === 'undefined'
          ? undefined
          : readModuleExports(inputFile);

      if (typeof props === 'undefined') {
        return configFile;
      }

      const filteredProps = filterProps(props);

      const appendProps = createPropAppender(filteredProps);

      return transformModuleExports(configFile, appendProps);
    },

    'package.json': withPackage(({ jest, ...data }) => data),
  };
};
