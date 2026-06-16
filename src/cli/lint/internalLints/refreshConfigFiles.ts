import path from 'path';
import { inspect, stripVTControlCharacters as stripAnsi } from 'util';

import fs from 'fs-extra';

import { Git } from '../../../index.js';
import {
  findCurrentWorkspaceProjectRoot,
  findWorkspaceRoot,
} from '../../../utils/dir.js';
import type { Logger } from '../../../utils/logging.js';
import { hasNpmrcSecret } from '../../../utils/npmrc.js';
import {
  type PackageManagerConfig,
  detectPackageManager,
} from '../../../utils/packageManager.js';
import { readBaseTemplateFile } from '../../../utils/template.js';
import { getDestinationManifest } from '../../configure/analysis/package.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';
import { mergeWithConfigFile } from '../../configure/processing/configFile.js';
import type { InternalLintResult } from '../internal.js';

type ConditionOptions = {
  packageManager: PackageManagerConfig;
  isInWorkspaceRoot: boolean;
};

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
  if?: (options: ConditionOptions) => boolean;
};

export const REFRESHABLE_CONFIG_FILES: RefreshableConfigFile[] = [
  {
    name: '.gitignore',
    type: 'ignore',
  },
  { name: '.prettierignore', type: 'ignore' },
  {
    name: '.npmrc',
    type: 'npmrc',
    additionalMapping: ensureNoAuthToken,
  },
  {
    name: '.dockerignore',
    type: 'ignore',
  },
];

export const refreshConfigFiles = async (
  mode: 'format' | 'lint',
  logger: Logger,
) => {
  const [manifest, gitRoot, workspaceRoot, currentWorkspaceProjectRoot] =
    await Promise.all([
      getDestinationManifest(),
      Git.findRoot({ dir: process.cwd() }),
      findWorkspaceRoot(),
      findCurrentWorkspaceProjectRoot(),
    ]);

  const destinationRoot = path.dirname(manifest.path);

  const readDestinationFile = createDestinationFileReader(destinationRoot);

  const refreshConfigFile = async (
    {
      name: filename,
      type,
      additionalMapping = (s) => s,
      if: condition = () => true,
    }: RefreshableConfigFile,
    conditionOptions: ConditionOptions,
  ) => {
    if (!condition(conditionOptions)) {
      return { needsChange: false };
    }

    if (type === 'npmrc') {
      const inputFile = await readDestinationFile(filename);

      if (inputFile === undefined) {
        return { needsChange: false };
      }

      const data = additionalMapping(inputFile, packageManager);
      const filepath = path.join(destinationRoot, filename);

      if (mode === 'format') {
        if (data === inputFile) {
          return { needsChange: false };
        }

        await fs.promises.writeFile(filepath, data);
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
          )} file contains secrets. Run \`${logger.bold(
            `${packageManager.print.exec} skuba format`,
          )}\` to remove them.`,
          filename,
        };
      }

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
      inputFile ? mergeWithConfigFile(templateFile)(inputFile) : templateFile,
      packageManager,
    );

    const filepath = path.join(destinationRoot, filename);

    if (mode === 'format') {
      if (data === inputFile) {
        return { needsChange: false };
      }

      await fs.promises.writeFile(filepath, data);
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
          `${packageManager.print.exec} skuba format`,
        )}\` to update it.`,
        filename,
      };
    }

    return { needsChange: false };
  };

  const packageManager = await detectPackageManager(destinationRoot);

  const results = await Promise.all(
    REFRESHABLE_CONFIG_FILES.map((conf) =>
      refreshConfigFile(conf, {
        packageManager,
        isInWorkspaceRoot: workspaceRoot === currentWorkspaceProjectRoot,
      }),
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
