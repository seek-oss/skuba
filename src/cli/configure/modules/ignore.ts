import { readBaseTemplateFile } from '../../../utils/template.js';
import { mergeWithConfigFile } from '../processing/configFile.js';
import type { Module } from '../types.js';

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
