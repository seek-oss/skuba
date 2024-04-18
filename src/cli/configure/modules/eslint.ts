import { readBaseTemplateFile } from '../../../utils/template';
import { mergeWithConfigFile } from '../processing/configFile';
import { deleteFiles } from '../processing/deleteFiles';
import { withPackage } from '../processing/package';
import { formatPrettier } from '../processing/prettier';
import type { Module } from '../types';

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
    '.eslintrc.js': (inputFile) => {
      if (inputFile?.includes('skuba')) {
        const processedFile = inputFile.replace(
          /require.resolve\(['"](@seek\/)?skuba\/config\/eslint['"]\)/,
          "'skuba'",
        );

        return formatPrettier(processedFile, { parser: 'typescript' });
      }

      return configFile;
    },

    '.eslintignore': mergeWithConfigFile(ignoreFile),

    'package.json': withPackage(({ eslintConfig, ...data }) => data),
  };
};
