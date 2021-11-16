import { readBaseTemplateFile } from '../../../utils/template';
import { mergeWithIgnoreFile } from '../processing/ignoreFile';
import type { Module } from '../types';

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
