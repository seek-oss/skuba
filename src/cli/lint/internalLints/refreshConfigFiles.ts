import path from 'path';
import { inspect } from 'util';

import { writeFile } from 'fs-extra';
import stripAnsi from 'strip-ansi';

import type { Logger } from '../../../utils/logging';
import { hasNpmrcSecret } from '../../../utils/npmrc';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../utils/packageManager';
import { readBaseTemplateFile } from '../../../utils/template';
import { getDestinationManifest } from '../../configure/analysis/package';
import { createDestinationFileReader } from '../../configure/analysis/project';
import { mergeWithIgnoreFile } from '../../configure/processing/ignoreFile';
import type { InternalLintResult } from '../internal';

const ensureNoAuthToken = (fileContents: string) =>
  fileContents
    .split('\n')
    .filter((line) => !hasNpmrcSecret(line))
    .join('\n');

const REFRESHABLE_CONFIG_FILES = [
  { name: '.eslintignore' },
  { name: '.gitignore' },
  { name: '.prettierignore' },
  {
    name: '.npmrc',
    additionalMapping: ensureNoAuthToken,
    if: (packageManager: PackageManagerConfig) =>
      packageManager.command === 'pnpm',
  },
];

export const refreshConfigFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
) => {
  const manifest = await getDestinationManifest();

  const destinationRoot = path.dirname(manifest.path);

  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const refreshConfigFile = async (
    filename: string,
    packageManager: PackageManagerConfig,
    additionalMapping: (
      s: string,
      packageManager: PackageManagerConfig,
    ) => string = (s) => s,
    condition: (packageManager: PackageManagerConfig) => boolean = () => true,
  ) => {
    if (!condition(packageManager)) {
      return { needsChange: false };
    }

    const [inputFile, templateFile] = await Promise.all([
      readDestinationFile(filename),
      readBaseTemplateFile(`_${filename}`),
    ]);

    const data = additionalMapping(
      inputFile ? mergeWithIgnoreFile(templateFile)(inputFile) : templateFile,
      packageManager,
    );

    const filepath = path.join(destinationRoot, filename);

    if (mode === 'format') {
      if (data === inputFile) {
        return { needsChange: false };
      }

      await writeFile(filepath, data);
      return {
        needsChange: false,
        msg: `Refreshed ${logger.bold(filename)}.`,
        filename,
      };
    }

    if (data !== inputFile) {
      return {
        needsChange: true,
        msg: `The ${logger.bold(
          filename,
        )} file is out of date. Run \`${logger.bold(
          packageManager.exec,
          'skuba',
          'format',
        )}\` to update it.`,
        filename,
      };
    }

    return { needsChange: false };
  };

  const packageManager = await detectPackageManager(destinationRoot);

  const results = await Promise.all(
    REFRESHABLE_CONFIG_FILES.map((conf) =>
      refreshConfigFile(
        conf.name,
        packageManager,
        conf.additionalMapping,
        conf.if,
      ),
    ),
  );

  // Log after for reproducible test output ordering
  results.forEach((result) => {
    if (result.msg) {
      logger.warn(result.msg, logger.dim('refresh-config-files'));
    }
  });

  const anyNeedChanging = results.some(({ needsChange }) => needsChange);

  return {
    ok: !anyNeedChanging,
    fixable: anyNeedChanging,
    annotations: results.flatMap(({ needsChange, filename, msg }) =>
      needsChange && msg
        ? [
            {
              path: filename,
              message: stripAnsi(msg),
            },
          ]
        : [],
    ),
  };
};

export const tryRefreshConfigFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  try {
    return await refreshConfigFiles(mode, logger);
  } catch (err) {
    logger.warn('Failed to refresh config files.');
    logger.subtle(inspect(err));

    return {
      ok: false,
      fixable: false,
      annotations: [],
    };
  }
};
