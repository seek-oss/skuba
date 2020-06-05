import { readBaseTemplateFile } from '../../../utils/template';
import { loadFiles } from '../processing/loadFiles';
import { withPackage } from '../processing/package';
import { getFirstDefined } from '../processing/record';
import { Module } from '../types';

const OTHER_CONFIG_FILENAMES = [
  '.github/renovate.json',
  '.renovaterc',
  '.renovaterc.json',
  'renovate.json',
  'renovate.json5',
];

export const renovateModule = async (): Promise<Module> => {
  const configFile = await readBaseTemplateFile('.github/renovate.json5');

  return {
    ...loadFiles(...OTHER_CONFIG_FILENAMES),

    '.github/renovate.json5': (_, files) => {
      // allow migration from other Renovate config files
      const inputFile = getFirstDefined(files, [
        '.github/renovate.json5',
        ...OTHER_CONFIG_FILENAMES,
      ]);

      // delete other Renovate config files
      OTHER_CONFIG_FILENAMES.forEach(
        (filename) => (files[filename] = undefined),
      );

      // allow customised Renovate configs that extend a SEEK configuration
      return inputFile?.includes('seek') ? inputFile : configFile;
    },

    /**
     * Ensure Renovate detects an application and not a library.
     *
     * @see {@link https://docs.renovatebot.com/configuration-options/#rangestrategy }
     * @see {@link https://github.com/renovatebot/renovate/blob/8c361082842bb157d85ca39ecf4f6075730e74bb/lib/manager/npm/extract/type.ts#L3 }
     */
    'package.json': withPackage(({ private: _, renovate, ...data }) => ({
      ...data,
      private: true,
    })),
  };
};
