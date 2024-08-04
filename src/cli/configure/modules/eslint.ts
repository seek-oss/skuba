import { readBaseTemplateFile } from '../../../utils/template';
import { deleteFiles } from '../processing/deleteFiles';
import { withPackage } from '../processing/package';
import { formatPrettier } from '../processing/prettier';
import type { Module } from '../types';

export const eslintModule = async (): Promise<Module> => {
  const configFile = await readBaseTemplateFile('_.eslintrc.js');

  return {
    ...deleteFiles(
      '.eslintrc.cjs',
      '.eslintrc.yaml',
      '.eslintrc.yml',
      '.eslintrc.json',
      '.eslintrc',
      '.eslintignore',
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

    'package.json': withPackage(({ eslintConfig, ...data }) => data),
  };
};
