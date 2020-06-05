import { readBaseTemplateFile } from '../../../utils/template';
import { deleteFiles } from '../processing/deleteFiles';
import { mergeWithIgnoreFile } from '../processing/ignoreFile';
import { withPackage } from '../processing/package';
import { Module } from '../types';

export const eslintModule = async (): Promise<Module> => {
  const [configFile, ignoreFile] = await Promise.all([
    readBaseTemplateFile('_.eslintrc.js'),
    readBaseTemplateFile('_.eslintignore'),
  ]);

  return {
    ...deleteFiles(
      '.eslintrc.cjs',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.eslintrc.json',
      '.eslintrc',
    ),

    // allow customised ESLint configs that extend skuba
    '.eslintrc.js': (inputFile) =>
      inputFile?.includes('@seek/skuba/config/eslint') ? inputFile : configFile,

    '.eslintignore': mergeWithIgnoreFile(ignoreFile),

    'package.json': withPackage(({ eslintConfig, ...data }) => data),
  };
};
