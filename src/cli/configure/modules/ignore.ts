import { readBaseTemplateFile } from '../../../utils/template';
import { mergeWithConfigFile } from '../processing/configFile';
import type { Module } from '../types';

export const ignoreModule = async (): Promise<Module> => {
  const [dockerFile, gitFile] = await Promise.all([
    readBaseTemplateFile('_.dockerignore'),
    readBaseTemplateFile('_.gitignore'),
  ]);

  return {
    '.dockerignore': mergeWithConfigFile(dockerFile),

    '.gitignore': mergeWithConfigFile(gitFile),
  };
};
