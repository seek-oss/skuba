import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import { rolldown } from 'rolldown';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { pathExists } from '../../utils/fs.js';

import { lambdaAsset } from './lambdaAsset.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');

const DEPS_LOCK_FILE_PATH = path.join(REPO_ROOT, 'pnpm-lock.yaml');

/**
 * A small, dependency-free package that is already a `skuba` dependency, so the
 * install resolves out of the local pnpm store rather than the registry.
 */
const NODE_MODULE = 'picomatch';

describe('lambdaAsset', () => {
  let workingDir: string;
  let entry: string;
  let outputDir: string;

  const bundle = async (plugin: ReturnType<typeof lambdaAsset>) => {
    const build = await rolldown({
      input: entry,
      external: [NODE_MODULE],
      plugins: [plugin],
      logLevel: 'silent',
    });

    try {
      await build.write({ dir: outputDir, format: 'es' });
    } finally {
      await build.close();
    }
  };

  const readOutputPackageJson = async () =>
    JSON.parse(
      await fs.promises.readFile(path.join(outputDir, 'package.json'), 'utf-8'),
    ) as Record<string, unknown>;

  beforeEach(async () => {
    workingDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'lambda-asset-int-'),
    );
    outputDir = path.join(workingDir, 'lib');
    entry = path.join(workingDir, 'lambda.ts');

    await fs.promises.writeFile(
      entry,
      [
        `import picomatch from '${NODE_MODULE}';`,
        '',
        'export const handler = (pattern: string, input: string): boolean =>',
        '  picomatch(pattern)(input);',
        '',
      ].join('\n'),
    );
  });

  afterEach(() => fs.remove(workingDir));

  it('writes only a package.json alongside the bundle when nodeModules is unset', async () => {
    await bundle(lambdaAsset());

    await expect(
      fs.promises.readdir(outputDir).then((files) => files.sort()),
    ).resolves.toEqual(['lambda.js', 'package.json']);
    await expect(readOutputPackageJson()).resolves.toEqual({ type: 'module' });
  });

  it('installs nodeModules and strips the install-only files', async () => {
    await bundle(
      lambdaAsset({
        nodeModules: [NODE_MODULE],
        projectRoot: REPO_ROOT,
        depsLockFilePath: DEPS_LOCK_FILE_PATH,
      }),
    );

    const { version } = JSON.parse(
      await fs.promises.readFile(
        path.join(REPO_ROOT, 'node_modules', NODE_MODULE, 'package.json'),
        'utf-8',
      ),
    ) as { version: string };

    await expect(readOutputPackageJson()).resolves.toMatchObject({
      type: 'module',
      dependencies: { [NODE_MODULE]: version },
    });

    // The external import must resolve out of the emitted `node_modules`.
    await expect(
      pathExists(
        path.join(outputDir, 'node_modules', NODE_MODULE, 'package.json'),
      ),
    ).resolves.toBe(true);

    // `.npmrc` may hold registry credentials; none of these may ship in the
    // asset. The `node_modules` metadata records machine-local paths and
    // timestamps, which would churn the CDK asset hash on every build.
    for (const file of [
      '.npmrc',
      '.pnpmfile.cjs',
      '.pnpmfile.mjs',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'patches',
      'node_modules/.modules.yaml',
      'node_modules/.pnpm-workspace-state-v1.json',
    ]) {
      await expect(pathExists(path.join(outputDir, file))).resolves.toBe(false);
    }
  }, 180_000);
});
