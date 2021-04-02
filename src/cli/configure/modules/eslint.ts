import { readBaseTemplateFile } from '../../../utils/template.js';
import { deleteFiles } from '../processing/deleteFiles.js';
import { mergeWithIgnoreFile } from '../processing/ignoreFile.js';
import { withPackage } from '../processing/package.js';
import { formatPrettier } from '../processing/prettier.js';
import { Module } from '../types.js';

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

    '.eslintignore': mergeWithIgnoreFile(ignoreFile),

    'package.json': withPackage(({ eslintConfig, ...data }) => data),
  };
};
