import * as path from 'node:path';

import { findUp } from 'find-up';
import fs from 'fs-extra';
import type { EmittedAsset, NormalizedOutputOptions, Plugin } from 'rolldown';

import { createExec } from '../../../../src/utils/exec.js';
import { pathExists } from '../../../../src/utils/fs.js';
import { log } from '../../../../src/utils/logging.js';

import {
  PNPM_INSTALL_COMMAND,
  PNPM_LOCK,
  PNPM_METADATA_FILES,
  extractDependencies,
  readPackageManagerPin,
  stageWorkspaceFiles,
} from './pnpm.js';

const PLUGIN_NAME = 'skuba:lambda-asset';

export interface LambdaAssetFile {
  /**
   * Path to the file or directory to copy, resolved relative to `projectRoot`.
   */
  from: string;

  /**
   * Destination path relative to the output directory.
   *
   * Defaults to the basename of `from`, placing it at the top of the output
   * directory.
   */
  to?: string;
}

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
   * Extra files or directories to copy into the output directory alongside the
   * bundle, e.g. static assets or configuration the handler reads at runtime.
   *
   * Each `from` is resolved relative to `projectRoot`; each `to` defaults to
   * the basename of `from` and is resolved relative to the output directory.
   */
  assets?: LambdaAssetFile[];

  /**
   * Directory that `nodeModules` versions are resolved from, and that `assets`
   * are copied from.
   *
   * This is the directory holding the `package.json` that depends on them; in a
   * workspace, that is the individual package rather than the workspace root.
   *
   * Relative paths resolve against rolldown's `cwd`, which defaults to
   * `process.cwd()`.
   */
  projectRoot?: string;

  /**
   * Path to the `pnpm-lock.yaml` to install against.
   *
   * pnpm keeps this at the workspace root, so its directory is also where the
   * workspace config and patches are staged from.
   *
   * Defaults to the nearest lock file, walking up from rolldown's `cwd`, which
   * defaults to `process.cwd()`. A relative path resolves against that `cwd`.
   */
  depsLockFilePath?: string;
}

const resolveOutputDir = (
  { dir, file }: NormalizedOutputOptions,
  cwd: string,
): string => {
  if (!dir) {
    throw new Error(
      `${PLUGIN_NAME} requires \`output.dir\`; it prepares a deployable directory, so a single \`output.file\`${
        file ? ` (${file})` : ''
      } has nowhere to install into.`,
    );
  }

  return path.resolve(cwd, dir);
};

const resolveLockFile = async (
  depsLockFilePath: string | undefined,
  cwd: string,
): Promise<string | undefined> => {
  if (!depsLockFilePath) {
    return findUp(PNPM_LOCK, { cwd });
  }

  const resolved = path.resolve(cwd, depsLockFilePath);
  if (!(await pathExists(resolved))) {
    throw new Error(
      `${PLUGIN_NAME} cannot find a ${PNPM_LOCK} at '${depsLockFilePath}'.`,
    );
  }

  return resolved;
};

const toPosix = (p: string): string => p.split(path.sep).join('/');

/**
 * Emits extra `assets` into the build output alongside the bundle.
 *
 * `from` is resolved relative to `projectRoot`; `to` becomes the emitted
 * `fileName`, which rolldown writes relative to the output directory, creating
 * parent directories as needed. Directories are emitted recursively, one asset
 * per file. `originalFileName` points rolldown at each source file so watch mode
 * rebuilds when it changes.
 */
const emitAssets = async (
  emit: (file: EmittedAsset) => void,
  projectRoot: string,
  assets: LambdaAssetFile[],
): Promise<void> => {
  await Promise.all(
    assets.map(async (asset) => {
      const from = path.resolve(projectRoot, asset.from);
      const to = asset.to ?? path.basename(asset.from);

      const normalized = path.normalize(to);
      if (
        path.isAbsolute(normalized) ||
        normalized === '.' ||
        normalized === '..' ||
        normalized.startsWith(`..${path.sep}`)
      ) {
        throw new Error(
          `${PLUGIN_NAME} refuses to copy asset '${asset.from}' to '${asset.to}': it escapes the output directory.`,
        );
      }

      const stat = await fs.promises.stat(from);
      const files = stat.isDirectory()
        ? (
            await fs.promises.readdir(from, {
              recursive: true,
              withFileTypes: true,
            })
          )
            .filter((entry) => entry.isFile())
            .map((entry) => path.join(entry.parentPath, entry.name))
        : [from];

      await Promise.all(
        files.map(async (absFile) => {
          const rel = path.relative(from, absFile);
          const fileName = toPosix(rel ? path.join(to, rel) : to);

          emit({
            type: 'asset',
            fileName,
            originalFileName: absFile,
            source: await fs.promises.readFile(absFile),
          });
        }),
      );
    }),
  );
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
 * 1. Emits any extra `assets` into the build output alongside the bundle, via
 *    rolldown's `emitFile`.
 * 2. Writes a `package.json` of `type: 'module'`.
 * 3. Installs `nodeModules` into the output directory with pnpm, staging the
 *    workspace config, `.npmrc`, lock file and patches to do so.
 * 4. Strips those install-only files back out, leaving the bundle, the
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
 *   plugins: [
 *     Rolldown.lambdaAsset({
 *       nodeModules: ['sharp'],
 *       assets: [{ from: 'src/config.json' }],
 *     }),
 *   ],
 * };
 * ```
 */
export const lambdaAsset = ({
  nodeModules = [],
  assets = [],
  projectRoot: projectRootOption,
  depsLockFilePath: depsLockFilePathOption,
}: LambdaAssetOptions = {}): Plugin => {
  // `writeBundle` fires once per output; only prepare each directory once, so
  // that outputs sharing a directory do not install twice.
  const prepared = new Set<string>();

  let cwd = process.cwd();

  return {
    name: PLUGIN_NAME,

    async buildStart(options) {
      cwd = options.cwd;
      prepared.clear();

      if (assets.length) {
        const projectRoot = path.resolve(cwd, projectRootOption ?? '.');
        await emitAssets((file) => this.emitFile(file), projectRoot, assets);
      }
    },

    async writeBundle(outputOptions) {
      const outputDir = resolveOutputDir(outputOptions, cwd);

      if (prepared.has(outputDir)) {
        return;
      }
      prepared.add(outputDir);

      const projectRoot = path.resolve(cwd, projectRootOption ?? '.');

      if (!nodeModules.length) {
        await writeOutputPackageJson(outputDir);
        return;
      }

      const depsLockFilePath = await resolveLockFile(
        depsLockFilePathOption,
        cwd,
      );

      if (!depsLockFilePath) {
        throw new Error(
          `${PLUGIN_NAME} cannot find a ${PNPM_LOCK}, which \`nodeModules\` requires. Specify one with \`depsLockFilePath\`.`,
        );
      }

      // pnpm keeps its lock file at the workspace root.
      const workspaceRoot = path.dirname(depsLockFilePath);

      const projectPackageJson = path.join(projectRoot, 'package.json');

      if (!(await pathExists(projectPackageJson))) {
        throw new Error(
          `${PLUGIN_NAME} cannot find a package.json in '${projectRoot}', which \`nodeModules\` requires. Specify the directory with \`projectRoot\`.`,
        );
      }

      const [dependencies, packageManager] = await Promise.all([
        extractDependencies(projectPackageJson, nodeModules),
        readPackageManagerPin(workspaceRoot),
      ]);

      await writeOutputPackageJson(outputDir, {
        dependencies,
        packageManager,
      });

      const stagedFiles: string[] = [];
      try {
        await stageWorkspaceFiles(workspaceRoot, outputDir, stagedFiles);

        const lockDest = path.join(outputDir, PNPM_LOCK);
        stagedFiles.push(lockDest);
        await fs.promises.copyFile(depsLockFilePath, lockDest);

        log.plain(
          log.bold(PLUGIN_NAME),
          'installing',
          log.bold(nodeModules.join(', ')),
        );

        const [bin, ...args] = PNPM_INSTALL_COMMAND;
        await createExec({ cwd: outputDir })(bin, ...args);
      } catch (err) {
        await stripInstallFiles(
          outputDir,
          [
            ...stagedFiles,
            path.join(outputDir, 'package.json'),
            path.join(outputDir, 'node_modules'),
          ],
          err,
        );
        throw err;
      }

      await stripInstallFiles(outputDir, stagedFiles);
    },
  };
};
