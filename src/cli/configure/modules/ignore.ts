import { readBaseTemplateFile } from '../../../utils/template.js';
import { mergeWithIgnoreFile } from '../processing/ignoreFile.js';
import { Module } from '../types.js';

export const ignoreModule = async (): Promise<Module> => {
  const [dockerFile, gitFile] = await Promise.all([
    readBaseTemplateFile('_.dockerignore'),
    readBaseTemplateFile('_.gitignore'),
  ]);

  return {
    '.dockerignore': mergeWithIgnoreFile(dockerFile),

    '.gitignore': mergeWithIgnoreFile(gitFile),
  };
};
