import * as path from 'node:path';

import { findUp } from 'find-up';
import fs from 'fs-extra';
import type { NormalizedOutputOptions, Plugin } from 'rolldown';

import { createExec } from '../../utils/exec.js';
import { pathExists } from '../../utils/fs.js';
import { log } from '../../utils/logging.js';

import {
  PNPM_INSTALL_COMMAND,
  PNPM_LOCK,
  PNPM_METADATA_FILES,
  extractDependencies,
  readPackageManagerField,
  stageWorkspaceFiles,
} from './pnpm.js';

const PLUGIN_NAME = 'skuba:lambda-asset';

export interface LambdaAssetOptions {
  /**
   * npm packages to install into the output directory rather than embed in the
   * bundle.
   *
   * Versions are resolved from the copy installed under `projectRoot`. Mark
   * these packages `external` in your rolldown config too, otherwise they will
   * be bundled _and_ installed.
   *
   * Packages with native binaries (e.g. `sharp`) are the usual candidates.
   */
  nodeModules?: string[];

  /**
   * Directory that `nodeModules` versions are resolved from.
   *
   * This is the directory holding the `package.json` that depends on them; in a
   * workspace, that is the individual package rather than the workspace root.
   *
   * Defaults to `process.cwd()`.
   */
  projectRoot?: string;

  /**
   * Path to the `pnpm-lock.yaml` to install against.
   *
   * pnpm keeps this at the workspace root, so its directory is also where the
   * workspace config and patches are staged from.
   *
   * Defaults to the nearest lock file, walking up from `process.cwd()`.
   */
  depsLockFilePath?: string;
}

const resolveOutputDir = ({ dir, file }: NormalizedOutputOptions): string => {
  if (!dir) {
    throw new Error(
      `${PLUGIN_NAME} requires \`output.dir\`; it prepares a deployable directory, so a single \`output.file\`${
        file ? ` (${file})` : ''
      } has nowhere to install into.`,
    );
  }

  return path.resolve(dir);
};

const resolveLockFile = async (
  depsLockFilePath: string | undefined,
): Promise<string | undefined> => {
  if (!depsLockFilePath) {
    return findUp(PNPM_LOCK);
  }

  const resolved = path.resolve(depsLockFilePath);
  if (!(await pathExists(resolved))) {
    throw new Error(
      `${PLUGIN_NAME} cannot find a ${PNPM_LOCK} at '${depsLockFilePath}'.`,
    );
  }

  return resolved;
};

const writeOutputPackageJson = (
  outputDir: string,
  fields: {
    dependencies?: Record<string, string>;
    packageManager?: string;
  } = {},
): Promise<void> =>
  fs.promises.writeFile(
    path.join(outputDir, 'package.json'),
    JSON.stringify({ type: 'module', ...fields }, null, 2),
  );

/**
 * Strips the install-only files back out of the output directory.
 *
 * `.npmrc` may hold registry credentials, so one path failing to remove must
 * not skip the rest, and the caller must hear about it.
 */
const stripInstallFiles = async (
  outputDir: string,
  stagedFiles: string[],
  cause?: unknown,
): Promise<void> => {
  const results = await Promise.allSettled(
    [
      ...stagedFiles,
      ...PNPM_METADATA_FILES.map((file) => path.join(outputDir, file)),
    ].map((file) => fs.remove(file)),
  );

  const reasons = results.flatMap((result) =>
    result.status === 'rejected' ? [String(result.reason)] : [],
  );

  if (reasons.length) {
    throw new Error(
      `${PLUGIN_NAME} could not strip install-only files from '${outputDir}'; these may include registry credentials and must not be deployed. ${reasons.join('; ')}`,
      { cause },
    );
  }
};

/**
 * Prepares a rolldown output directory for deployment as a Lambda asset.
 *
 * The plugin supports ESM output and pnpm only. It makes no assumptions about
 * how you bundle; it only augments what rolldown has already written:
 *
 * 1. Writes a `package.json` of `type: 'module'`.
 * 2. Installs `nodeModules` into the output directory with pnpm, staging the
 *    workspace config, `.npmrc`, lock file and patches to do so.
 * 3. Strips those install-only files back out, leaving the bundle, the
 *    generated `package.json` and `node_modules`.
 *
 * The result can be handed to CDK as `aws_lambda.Code.fromAsset(outputDir)`.
 *
 * @example
 * ```js
 * // rolldown.config.mjs
 * import { Rolldown } from 'skuba';
 *
 * export default {
 *   input: 'src/lambda.ts',
 *   output: { dir: 'lib' },
 *   external: ['sharp'],
 *   plugins: [Rolldown.lambdaAsset({ nodeModules: ['sharp'] })],
 * };
 * ```
 */
export const lambdaAsset = ({
  nodeModules = [],
  projectRoot: projectRootOption,
  depsLockFilePath: depsLockFilePathOption,
}: LambdaAssetOptions = {}): Plugin => {
  // `writeBundle` fires once per output; only prepare each directory once, so
  // that outputs sharing a directory do not install twice.
  const prepared = new Set<string>();

  return {
    name: PLUGIN_NAME,

    buildStart() {
      prepared.clear();
    },

    async writeBundle(outputOptions) {
      const outputDir = resolveOutputDir(outputOptions);

      if (prepared.has(outputDir)) {
        return;
      }
      prepared.add(outputDir);

      if (!nodeModules.length) {
        await writeOutputPackageJson(outputDir);
        return;
      }

      const depsLockFilePath = await resolveLockFile(depsLockFilePathOption);

      if (!depsLockFilePath) {
        throw new Error(
          `${PLUGIN_NAME} cannot find a ${PNPM_LOCK}, which \`nodeModules\` requires. Specify one with \`depsLockFilePath\`.`,
        );
      }

      // pnpm keeps its lock file at the workspace root.
      const workspaceRoot = path.dirname(depsLockFilePath);

      const projectRoot = path.resolve(projectRootOption ?? process.cwd());
      const projectPackageJson = path.join(projectRoot, 'package.json');

      if (!(await pathExists(projectPackageJson))) {
        throw new Error(
          `${PLUGIN_NAME} cannot find a package.json in '${projectRoot}', which \`nodeModules\` requires. Specify the directory with \`projectRoot\`.`,
        );
      }

      await writeOutputPackageJson(outputDir, {
        dependencies: await extractDependencies(
          projectPackageJson,
          nodeModules,
        ),
        packageManager: await readPackageManagerField(workspaceRoot),
      });

      const stagedFiles: string[] = [];
      try {
        await stageWorkspaceFiles(workspaceRoot, outputDir, stagedFiles);

        const lockDest = path.join(outputDir, PNPM_LOCK);
        await fs.promises.copyFile(depsLockFilePath, lockDest);
        stagedFiles.push(lockDest);

        log.plain(
          log.bold(PLUGIN_NAME),
          'installing',
          log.bold(nodeModules.join(', ')),
        );

        const [bin, ...args] = PNPM_INSTALL_COMMAND;
        await createExec({ cwd: outputDir })(bin, ...args);
      } catch (err) {
        await stripInstallFiles(outputDir, stagedFiles, err);
        throw err;
      }

      await stripInstallFiles(outputDir, stagedFiles);
    },
  };
};
