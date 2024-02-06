import { readBaseTemplateFile } from '../../../utils/template';
import { mergeWithConfigFile } from '../processing/configFile';
import { deleteFiles } from '../processing/deleteFiles';
import { withPackage } from '../processing/package';
import type { Module } from '../types';

export const prettierModule = async (): Promise<Module> => {
  const [configFile, ignoreFile] = await Promise.all([
    readBaseTemplateFile('_.prettierrc.js'),
    readBaseTemplateFile('_.prettierignore'),
  ]);

  return {
    ...deleteFiles(
      '.prettierrc',
      '.prettierrc.json',
      '.prettierrc.toml',
      '.prettierrc.yaml',
      '.prettierrc.yml',
      'prettier.config.js',
    ),

    '.prettierignore': mergeWithConfigFile(ignoreFile),

    // enforce skuba opinions as there's no value in customising Prettier configs
    '.prettierrc.js': () => configFile,

    'package.json': withPackage(({ prettier, ...data }) => data),
  };
};
