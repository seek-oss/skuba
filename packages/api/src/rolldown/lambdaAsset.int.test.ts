import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import { rolldown } from 'rolldown';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pathExists } from '../../../../src/utils/fs.js';

import { lambdaAsset } from './lambdaAsset.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

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
    vi.stubEnv('ENVIRONMENT', undefined);

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

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.remove(workingDir);
  });

  it('writes only a package.json alongside the bundle when nodeModules is unset', async () => {
    await bundle(lambdaAsset());

    await expect(
      fs.promises.readdir(outputDir).then((files) => files.sort()),
    ).resolves.toEqual(['lambda.js', 'package.json']);
    await expect(readOutputPackageJson()).resolves.toEqual({ type: 'module' });
  });

  it('emits assets alongside the bundle', async () => {
    const assetsRoot = path.join(workingDir, 'assets');
    await fs.promises.mkdir(path.join(assetsRoot, 'templates'), {
      recursive: true,
    });
    await fs.promises.writeFile(
      path.join(assetsRoot, 'config.json'),
      '{"hello":"world"}',
    );
    await fs.promises.writeFile(path.join(assetsRoot, 'cert.pem'), 'PEM');
    await fs.promises.writeFile(
      path.join(assetsRoot, 'templates', 'email.html'),
      '<p>hi</p>',
    );

    await bundle(
      lambdaAsset({
        projectRoot: assetsRoot,
        assets: [
          { from: 'config.json' },
          { from: 'cert.pem', to: 'certs/cert.pem' },
          { from: 'templates', to: 'templates' },
        ],
      }),
    );

    await expect(
      fs.promises.readFile(path.join(outputDir, 'config.json'), 'utf-8'),
    ).resolves.toBe('{"hello":"world"}');
    await expect(
      fs.promises.readFile(path.join(outputDir, 'certs', 'cert.pem'), 'utf-8'),
    ).resolves.toBe('PEM');
    await expect(
      fs.promises.readFile(
        path.join(outputDir, 'templates', 'email.html'),
        'utf-8',
      ),
    ).resolves.toBe('<p>hi</p>');
  });

  describe('when ENVIRONMENT=test', () => {
    beforeEach(() => {
      vi.stubEnv('ENVIRONMENT', 'test');
    });

    it('emits a stub bundle without installing or copying assets', async () => {
      await bundle(
        lambdaAsset({
          nodeModules: [NODE_MODULE],
          assets: [{ from: 'does-not-exist.json' }],
          projectRoot: path.join(workingDir, 'missing'),
          depsLockFilePath: path.join(workingDir, 'missing', 'pnpm-lock.yaml'),
        }),
      );

      await expect(
        fs.promises.readdir(outputDir).then((files) => files.sort()),
      ).resolves.toEqual(['lambda.js', 'package.json']);
      await expect(readOutputPackageJson()).resolves.toEqual({
        type: 'module',
      });

      const stub = await fs.promises.readFile(
        path.join(outputDir, 'lambda.js'),
        'utf-8',
      );
      expect(stub).toContain('export');
      expect(stub).toContain('handler');
      expect(stub).not.toContain(NODE_MODULE);
    });

    it('emits identical stubs regardless of source', async () => {
      await bundle(lambdaAsset());
      const first = await fs.promises.readFile(
        path.join(outputDir, 'lambda.js'),
        'utf-8',
      );

      await fs.remove(outputDir);
      await fs.promises.writeFile(entry, 'export const handler = () => 42;\n');

      await bundle(lambdaAsset());
      await expect(
        fs.promises.readFile(path.join(outputDir, 'lambda.js'), 'utf-8'),
      ).resolves.toBe(first);
    });

    it('names stub chunks after their input keys and tolerates missing sources', async () => {
      const build = await rolldown({
        input: { index: path.join(workingDir, 'src', 'missing.ts') },
        plugins: [lambdaAsset()],
        logLevel: 'silent',
      });

      try {
        await build.write({ dir: outputDir, format: 'es' });
      } finally {
        await build.close();
      }

      await expect(
        fs.promises.readdir(outputDir).then((files) => files.sort()),
      ).resolves.toEqual(['index.js', 'package.json']);
    });
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
