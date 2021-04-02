import { readBaseTemplateFile } from '../../../utils/template.js';
import { deleteFiles } from '../processing/deleteFiles.js';
import { mergeWithIgnoreFile } from '../processing/ignoreFile.js';
import { withPackage } from '../processing/package.js';
import { Module } from '../types.js';

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

    '.prettierignore': mergeWithIgnoreFile(ignoreFile),

    // enforce skuba opinions as there's no value in customising Prettier configs
    '.prettierrc.js': () => configFile,

    'package.json': withPackage(({ prettier, ...data }) => data),
  };
};
