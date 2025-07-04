import { readBaseTemplateFile } from '../../../utils/template.js';
import { deleteFiles } from '../processing/deleteFiles.js';
import { withPackage } from '../processing/package.js';
import { formatPrettier } from '../processing/prettier.js';
import type { Module } from '../types.js';

export const eslintModule = async (): Promise<Module> => {
  const configFile = await readBaseTemplateFile('_eslint.config.js');

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
    'eslint.config.js': (inputFile) => {
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
