import { readBaseTemplateFile } from '../../../utils/template.js';
import { deleteFiles } from '../processing/deleteFiles.js';
import { loadFiles } from '../processing/loadFiles.js';
import { withPackage } from '../processing/package.js';
import {
  createPropAppender,
  createPropFilter,
  readModuleExports,
  transformModuleImportsAndExports,
} from '../processing/typescript.js';
import { Module } from '../types.js';

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
    readBaseTemplateFile('jest.config.ts'),
    readBaseTemplateFile('jest.setup.ts'),
  ]);

  return {
    ...deleteFiles('jest.config.js'),
    ...loadFiles('jest.setup.js'),

    'jest.config.ts': (tsFile, currentFiles, initialFiles) => {
      // Allow customised TS Jest config that extends skuba
      if (tsFile?.includes('skuba')) {
        return tsFile;
      }

      const jsFile = initialFiles['jest.config.js'];

      // Migrate a JS config that extends skuba, retaining all existing props
      if (jsFile?.includes('skuba')) {
        return transformModuleImportsAndExports(jsFile, (_, p) => p);
      }

      currentFiles['jest.setup.ts'] ??= setupFile;

      const inputFile = tsFile ?? jsFile;

      const props =
        typeof inputFile === 'undefined'
          ? undefined
          : readModuleExports(inputFile);

      if (typeof props === 'undefined') {
        return configFile;
      }

      const filteredProps = filterProps(null, props);

      const appendProps = createPropAppender(filteredProps);

      // Append a subset of custom props to our base `jest.config.ts`
      return transformModuleImportsAndExports(configFile, appendProps);
    },

    'package.json': withPackage(({ jest, ...data }) => data),
  };
};
