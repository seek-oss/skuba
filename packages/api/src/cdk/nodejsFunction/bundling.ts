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
  PNPM_WORKSPACE_FILES,
  copyWorkspaceFiles,
  readPackageManagerMeta,
} from './package-manager.js';
import type { BundlingOptions } from './types.js';
import {
  BUNDLE_META_FILENAME,
  extractDependencies,
  isEsmFormat,
  isInside,
  isRecord,
  parseJsonFile,
} from './util.js';

export interface BundlingProps extends BundlingOptions {
  entry: string;
  depsLockFilePath: string;
  projectRoot: string;
}

const SPAWN_MAX_BUFFER = 256 * 1024 * 1024;

const describeExit = (result: {
  signal: NodeJS.Signals | null;
  status: number | null;
}): string =>
  result.signal != null
    ? `killed by signal ${result.signal}`
    : `exited with status ${result.status}`;

const stderrTail = (stderr: string | Buffer | null | undefined): string => {
  if (!stderr) {
    return '';
  }
  const text = typeof stderr === 'string' ? stderr : stderr.toString('utf-8');
  if (!text) {
    return '';
  }
  const tail = text.trimEnd().split('\n').slice(-20).join('\n');
  return tail ? `\n\n${tail}` : '';
};

const checkSpawnResult = (
  result: SpawnSyncReturns<string | Buffer>,
  prefix: string,
): void => {
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === 'ETIMEDOUT') {
      throw new ValidationError(
        `${prefix} timed out.${stderrTail(result.stderr)}`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    throw new ValidationError(
      `${prefix} ${describeExit(result)}.${stderrTail(result.stderr)}`,
    );
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
    isEsm?: boolean;
    packageManager?: string;
  },
): void => {
  const pkg: Record<string, unknown> = {};
  if (fields.dependencies) {
    pkg.dependencies = fields.dependencies;
  }
  if (fields.isEsm) {
    pkg.type = 'module';
  }
  if (fields.packageManager) {
    pkg.packageManager = fields.packageManager;
  }
  if (Object.keys(pkg).length === 0) {
    return;
  }
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

        const isEsm = this.readBundleMeta(outputDir);

        const { nodeModules } = this.props;
        if (nodeModules?.length) {
          this.installNodeModules(outputDir, isEsm, nodeModules);
        } else {
          writeOutputPackageJson(outputDir, { isEsm });
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

  private readBundleMeta(outputDir: string): boolean {
    const metaPath = path.join(outputDir, BUNDLE_META_FILENAME);
    if (!fs.existsSync(metaPath)) {
      return false;
    }
    try {
      const parsed: unknown = parseJsonFile(metaPath);
      const format =
        isRecord(parsed) && typeof parsed.format === 'string'
          ? parsed.format
          : undefined;
      return isEsmFormat(format);
    } finally {
      fs.unlinkSync(metaPath);
    }
  }

  private installNodeModules(
    outputDir: string,
    isEsm: boolean,
    nodeModules: string[],
  ): void {
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
      isEsm,
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
        fs.copyFileSync(
          this.props.depsLockFilePath,
          path.join(outputDir, PNPM_LOCK),
        );
      }

      const [installBin, ...installArgs] = PNPM_INSTALL_COMMAND;
      this.spawn(
        installBin,
        installArgs,
        outputDir,
        "Package manager 'pnpm' install",
      );
    } finally {
      fs.rmSync(path.join(outputDir, PNPM_LOCK), { force: true });
      for (const file of PNPM_WORKSPACE_FILES) {
        fs.rmSync(path.join(outputDir, file), { force: true });
      }
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
