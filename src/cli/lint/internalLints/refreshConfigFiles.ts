import path from 'path';
import { inspect, stripVTControlCharacters as stripAnsi } from 'util';

import { writeFile } from 'fs-extra';

import { Git } from '../../..';
import type { Logger } from '../../../utils/logging';
import { NPMRC_LINES, hasNpmrcSecret } from '../../../utils/npmrc';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../utils/packageManager';
import { readBaseTemplateFile } from '../../../utils/template';
import { getDestinationManifest } from '../../configure/analysis/package';
import { createDestinationFileReader } from '../../configure/analysis/project';
import { mergeWithConfigFile } from '../../configure/processing/configFile';
import type { InternalLintResult } from '../internal';

const ensureNoAuthToken = (fileContents: string) =>
  fileContents
    .split('\n')
    .filter((line) => !hasNpmrcSecret(line))
    .join('\n');

type RefreshableConfigFile = {
  name: string;
  type: 'ignore' | 'npmrc';
  additionalMapping?: (
    s: string,
    packageManager: PackageManagerConfig,
  ) => string;
  if?: (packageManager: PackageManagerConfig) => boolean;
};

const removeRedundantNpmrc = (contents: string) => {
  const npmrcLines = contents
    .split('\n')
    .filter((line) => NPMRC_LINES.includes(line.trim()));

  // If we're only left with !.npmrc line we can remove it
  // TODO: Consider if we should generalise this
  if (npmrcLines.length > 0 && npmrcLines.every((line) => line.includes('!'))) {
    return contents
      .split('\n')
      .filter((line) => !NPMRC_LINES.includes(line.trim()))
      .join('\n');
  }
  return contents;
};

export const REFRESHABLE_CONFIG_FILES: RefreshableConfigFile[] = [
  {
    name: '.gitignore',
    type: 'ignore',
    additionalMapping: removeRedundantNpmrc,
  },
  { name: '.prettierignore', type: 'ignore' },
  {
    name: '.npmrc',
    type: 'npmrc',
    additionalMapping: ensureNoAuthToken,
    if: (packageManager: PackageManagerConfig) =>
      packageManager.command === 'pnpm',
  },
  {
    name: '.dockerignore',
    type: 'ignore',
    additionalMapping: removeRedundantNpmrc,
  },
];

export const refreshConfigFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
) => {
  const [manifest, gitRoot] = await Promise.all([
    getDestinationManifest(),
    Git.findRoot({ dir: process.cwd() }),
  ]);

  const destinationRoot = path.dirname(manifest.path);

  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const refreshConfigFile = async (
    {
      name: filename,
      type: fileType,
      additionalMapping = (s) => s,
      if: condition = () => true,
    }: RefreshableConfigFile,
    packageManager: PackageManagerConfig,
  ) => {
    if (!condition(packageManager)) {
      return { needsChange: false };
    }

    const [inputFile, templateFile, isGitIgnored] = await Promise.all([
      readDestinationFile(filename),
      readBaseTemplateFile(`_${filename}`),
      gitRoot
        ? Git.isFileGitIgnored({
            gitRoot,
            absolutePath: path.join(destinationRoot, filename),
          })
        : false,
    ]);

    // If the file is gitignored and doesn't exist, don't make it
    if (inputFile === undefined && isGitIgnored) {
      return { needsChange: false };
    }

    const data = additionalMapping(
      inputFile
        ? mergeWithConfigFile(templateFile, fileType)(inputFile)
        : templateFile,
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
          packageManager.print.exec,
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
      refreshConfigFile(conf, packageManager),
    ),
  );

  // Log after for reproducible test output ordering
  results.forEach((result) => {
    if (result.msg) {
      logger.warn(result.msg);
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
