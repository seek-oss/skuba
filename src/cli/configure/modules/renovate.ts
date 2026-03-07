import { readBaseTemplateFile } from '../../../utils/template.js';
import { deleteFiles } from '../processing/deleteFiles.js';
import { withPackage } from '../processing/package.js';
import { formatPrettier } from '../processing/prettier.js';
import { getFirstDefined } from '../processing/record.js';
import type { Module, Options, PackageJson } from '../types.js';

const OTHER_CONFIG_FILENAMES = [
  '.github/renovate.json',
  '.renovaterc',
  '.renovaterc.json',
  'renovate.json',
  'renovate.json5',
];

export const RENOVATE_CONFIG_FILENAMES = [
  '.github/renovate.json5',
  ...OTHER_CONFIG_FILENAMES,
];

export const renovateModule = async ({ type }: Options): Promise<Module> => {
  const configFile = await readBaseTemplateFile('.github/renovate.json5');

  return {
    ...deleteFiles(...OTHER_CONFIG_FILENAMES),

    '.github/renovate.json5': (_inputFile, _files, initialFiles) => {
      // allow migration from other Renovate config files
      const inputFile = getFirstDefined(initialFiles, [
        '.github/renovate.json5',
        ...OTHER_CONFIG_FILENAMES,
      ]);

      // allow customised Renovate configs that extend a SEEK configuration
      return inputFile?.includes('seek')
        ? formatPrettier(inputFile, { parser: 'json5' })
        : configFile;
    },

    /**
     * Ensure Renovate correctly detects the project as an application/library.
     *
     * @see {@link https://docs.renovatebot.com/configuration-options/#rangestrategy }
     * @see {@link https://github.com/renovatebot/renovate/blob/8c361082842bb157d85ca39ecf4f6075730e74bb/lib/manager/npm/extract/type.ts#L3 }
     */
    'package.json': withPackage(
      ({ private: _, renovate, ...data }) =>
        ({
          ...data,
          private: type !== 'package',
        }) as PackageJson,
    ),
  };
};
