import { readBaseTemplateFile } from '../../../utils/template';
import { deleteFiles } from '../processing/deleteFiles';
import { mergeWithIgnoreFile } from '../processing/ignoreFile';
import { withPackage } from '../processing/package';
import type { Module } from '../types';

export const prettierModule = async (): Promise<Module> => {
  const [configFile, ignoreFile] = await Promise.all([
    readBaseTemplateFile('_.prettierrc.cjs'),
    readBaseTemplateFile('_.prettierignore'),
  ]);

  return {
    ...deleteFiles(
      '.prettierrc',
      'prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.toml',
      '.prettierrc.yaml',
      '.prettierrc.yml',
      'prettier.config.js',
    ),

    '.prettierignore': mergeWithIgnoreFile(ignoreFile),

    // enforce skuba opinions as there's no value in customising Prettier configs
    '.prettierrc.cjs': () => configFile,

    'package.json': withPackage(({ prettier, ...data }) => data),
  };
};
