import path from 'path';
import { inspect, stripVTControlCharacters as stripAnsi } from 'util';

import fs from 'fs-extra';

import { Git } from '../../../index.js';
import {
  findCurrentWorkspaceProjectRoot,
  findWorkspaceRoot,
} from '../../../utils/dir.js';
import type { Logger } from '../../../utils/logging.js';
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

type RefreshableConfigFile = {
  name: string;
  type: 'ignore' | 'pnpm-workspace';
  additionalMapping?: (
    s: string,
    packageManager: PackageManagerConfig,
  ) => string;
  if?: (options: ConditionOptions) => boolean;
};

const OLD_IGNORE_WARNING = `# Ignore .npmrc. This is no longer managed by skuba as pnpm projects use a managed .npmrc.
# IMPORTANT: if migrating to pnpm, remove this line and add an .npmrc IN THE SAME COMMIT.
# You can use \`skuba format\` to generate the file or otherwise commit an empty file.
# Doing so will conflict with a local .npmrc and make it more difficult to unintentionally commit auth secrets.
.npmrc
`;

const removeOldWarning = (contents: string) =>
  contents.includes(OLD_IGNORE_WARNING)
    ? `${contents.replace(OLD_IGNORE_WARNING, '').trim()}\n`
    : contents;

export const REFRESHABLE_CONFIG_FILES: RefreshableConfigFile[] = [
  {
    name: '.gitignore',
    type: 'ignore',
    additionalMapping: removeOldWarning,
  },
  { name: '.prettierignore', type: 'ignore' },
  {
    name: 'pnpm-workspace.yaml',
    type: 'pnpm-workspace',
    if: ({ packageManager, isInWorkspaceRoot }) =>
      isInWorkspaceRoot && packageManager.command === 'pnpm',
  },
  {
    name: '.dockerignore',
    type: 'ignore',
    additionalMapping: removeOldWarning,
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
      type: fileType,
      additionalMapping = (s) => s,
      if: condition = () => true,
    }: RefreshableConfigFile,
    conditionOptions: ConditionOptions,
  ) => {
    if (!condition(conditionOptions)) {
      return { needsChange: false };
    }

    const maybeReadPackageJson = async (type: RefreshableConfigFile['type']) =>
      type === 'pnpm-workspace'
        ? await readDestinationFile('package.json')
        : undefined;

    const [inputFile, templateFile, isGitIgnored, packageJson] =
      await Promise.all([
        readDestinationFile(filename),
        readBaseTemplateFile(`_${filename}`),
        gitRoot
          ? Git.isFileGitIgnored({
              gitRoot,
              absolutePath: path.join(destinationRoot, filename),
            })
          : false,
        maybeReadPackageJson(fileType),
      ]);

    // If the file is gitignored and doesn't exist, don't make it
    if (inputFile === undefined && isGitIgnored) {
      return { needsChange: false };
    }

    const data = additionalMapping(
      inputFile
        ? mergeWithConfigFile(templateFile, fileType, packageJson)(inputFile)
        : templateFile,
      packageManager,
    );

    const filepath = path.join(destinationRoot, filename);

    if (mode === 'format') {
      if (data === inputFile) {
        return { needsChange: false };
      }

      await fs.writeFile(filepath, data);
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
