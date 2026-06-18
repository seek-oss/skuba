import { type SpawnSyncReturns, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ILocalBundling } from 'aws-cdk-lib';
import * as cdk from 'aws-cdk-lib';
import type { AssetCode } from 'aws-cdk-lib/aws-lambda';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { resolveRolldownBridge } from './bridge-path.js';
import { ValidationError } from './errors.js';
import {
  PNPM_INSTALL_COMMAND,
  PNPM_LOCK,
  copyWorkspaceFiles,
  readPackageManagerMeta,
} from './package-manager.js';
import type { BundlingOptions } from './types.js';
import { extractDependencies, isInside } from './util.js';

export interface BundlingProps extends BundlingOptions {
  entry: string;
  depsLockFilePath: string;
  projectRoot: string;
}

const SPAWN_MAX_BUFFER = 16 * 1024 * 1024;

const stderrTail = (stderr: string | null | undefined): string => {
  if (!stderr) {
    return '';
  }
  const tail = stderr.trimEnd().split('\n').slice(-20).join('\n');
  return tail ? `\n\n${tail}` : '';
};

const checkSpawnResult = (
  result: SpawnSyncReturns<string>,
  prefix: string,
): void => {
  if (result.error) {
    const code = (result.error as NodeJS.ErrnoException).code;
    if (code === 'ETIMEDOUT') {
      throw new ValidationError(
        `${prefix} timed out.${stderrTail(result.stderr)}`,
      );
    }
    if (code === 'ENOBUFS') {
      throw new ValidationError(
        `${prefix} produced more than ${SPAWN_MAX_BUFFER / (1024 * 1024)}MB of output.${stderrTail(result.stderr)}`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    const exit =
      result.signal != null
        ? `killed by signal ${result.signal}`
        : `exited with status ${result.status}`;
    throw new ValidationError(`${prefix} ${exit}.${stderrTail(result.stderr)}`);
  }
  // Surface captured stderr (e.g. bundler warnings) only on success; on failure
  // the tail is already in the thrown error message.
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
};

const writeOutputPackageJson = (
  outputDir: string,
  fields: {
    dependencies?: Record<string, string>;
    packageManager?: string;
  },
): void => {
  const pkg = {
    type: 'module',
    dependencies: fields.dependencies,
    packageManager: fields.packageManager,
  };
  fs.writeFileSync(
    path.join(outputDir, 'package.json'),
    JSON.stringify(pkg, null, 2),
  );
};

export const removeEmptyParentDirs = (
  startDir: string,
  outputDir: string,
): void => {
  let dir = startDir;
  while (dir !== outputDir && isInside(outputDir, dir)) {
    try {
      fs.rmdirSync(dir);
    } catch {
      return;
    }
    dir = path.dirname(dir);
  }
};

export class Bundling implements cdk.BundlingOptions {
  static bundle(props: BundlingProps): AssetCode {
    return lambda.Code.fromAsset(props.projectRoot, {
      assetHash: props.assetHash,
      assetHashType: props.assetHash
        ? cdk.AssetHashType.CUSTOM
        : cdk.AssetHashType.OUTPUT,
      bundling: new Bundling(props),
    });
  }

  // Required by the CDK BundlingOptions interface; local bundling always succeeds.
  public readonly image: cdk.DockerImage;
  public readonly local: ILocalBundling;

  constructor(private readonly props: BundlingProps) {
    this.image = cdk.DockerImage.fromRegistry('dummy');
    this.local = this.buildLocalBundling();
  }

  private buildLocalBundling(): ILocalBundling {
    return {
      tryBundle: (outputDir: string): boolean => {
        this.runHooks(
          this.props.commandHooks?.beforeBundling(
            this.props.projectRoot,
            outputDir,
          ) ?? [],
          this.props.projectRoot,
        );

        this.runBundler(outputDir);

        const { nodeModules } = this.props;
        if (nodeModules?.length) {
          this.installNodeModules(outputDir, nodeModules);
        } else {
          writeOutputPackageJson(outputDir, {});
        }

        this.runHooks(
          this.props.commandHooks?.afterBundling(
            this.props.projectRoot,
            outputDir,
          ) ?? [],
          this.props.projectRoot,
        );

        return true;
      },
    };
  }

  private runHooks(commands: string[], cwd: string): void {
    for (const cmd of commands) {
      this.spawn(cmd, [], cwd, `Command hook '${cmd}'`, { shell: true });
    }
  }

  private runBundler(outputDir: string): void {
    this.spawn(
      'node',
      [
        resolveRolldownBridge(),
        this.props.bundlerConfig,
        this.props.entry,
        outputDir,
      ],
      this.props.projectRoot,
      "Bundler 'rolldown'",
    );
  }

  private installNodeModules(outputDir: string, nodeModules: string[]): void {
    const { nearestPackageJson, packageManagerField } = readPackageManagerMeta(
      this.props.projectRoot,
    );

    if (!nearestPackageJson) {
      throw new ValidationError(
        'Cannot find a package.json. Using nodeModules requires a package.json.',
      );
    }

    this.runHooks(
      this.props.commandHooks?.beforeInstall(
        this.props.projectRoot,
        outputDir,
      ) ?? [],
      this.props.projectRoot,
    );

    writeOutputPackageJson(outputDir, {
      dependencies: extractDependencies(nearestPackageJson, nodeModules),
      packageManager: packageManagerField,
    });

    const stagedFiles: string[] = [];
    try {
      copyWorkspaceFiles(
        this.props.projectRoot,
        outputDir,
        nodeModules,
        this.props.ignoreScripts,
        stagedFiles,
      );

      if (fs.existsSync(this.props.depsLockFilePath)) {
        const lockDest = path.join(outputDir, PNPM_LOCK);
        fs.copyFileSync(this.props.depsLockFilePath, lockDest);
        stagedFiles.push(lockDest);
      }

      const [installBin, ...installArgs] = PNPM_INSTALL_COMMAND;
      this.spawn(
        installBin,
        installArgs,
        outputDir,
        "Package manager 'pnpm' install",
      );
    } finally {
      for (const file of stagedFiles) {
        fs.rmSync(file, { force: true });
        removeEmptyParentDirs(path.dirname(file), outputDir);
      }
    }
  }

  private spawn(
    bin: string,
    args: string[],
    cwd: string,
    prefix: string,
    opts?: { shell?: boolean },
  ): void {
    const result = spawnSync(bin, args, {
      env: process.env,
      stdio: ['ignore', 'inherit', 'pipe'],
      cwd,
      timeout: this.props.timeout,
      encoding: 'utf-8',
      maxBuffer: SPAWN_MAX_BUFFER,
      shell: opts?.shell,
    });

    checkSpawnResult(result, prefix);
  }
}
