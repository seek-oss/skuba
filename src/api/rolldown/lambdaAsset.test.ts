import * as os from 'node:os';
import * as path from 'node:path';

import fs from 'fs-extra';
import type { NormalizedOutputOptions, Plugin } from 'rolldown';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createExec } from '../../utils/exec.js';
import { pathExists } from '../../utils/fs.js';

import { lambdaAsset } from './lambdaAsset.js';

vi.mock('../../utils/exec.js', () => ({ createExec: vi.fn() }));

const install = vi.fn();

const writeBundle = (
  plugin: Plugin,
  outputOptions: Partial<NormalizedOutputOptions>,
): Promise<void> => {
  const hook = plugin.writeBundle;

  if (typeof hook !== 'function') {
    throw new Error('Expected `writeBundle` to be a function hook');
  }

  return Promise.resolve(
    hook.call(
      undefined as never,
      outputOptions as NormalizedOutputOptions,
      {} as never,
    ),
  );
};

const buildStart = async (plugin: Plugin): Promise<void> => {
  const hook = plugin.buildStart;

  if (typeof hook !== 'function') {
    throw new Error('Expected `buildStart` to be a function hook');
  }

  await hook.call(undefined as never, undefined as never);
};

describe('lambdaAsset', () => {
  let outputDir: string;

  const readOutputPackageJson = async () =>
    JSON.parse(
      await fs.promises.readFile(path.join(outputDir, 'package.json'), 'utf-8'),
    ) as Record<string, unknown>;

  beforeEach(async () => {
    outputDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'lambda-asset-'),
    );

    install.mockReset().mockResolvedValue(undefined);
    vi.mocked(createExec).mockReturnValue(install as never);
  });

  afterEach(() => fs.remove(outputDir));

  it('is named so it can be identified in rolldown output', () =>
    expect(lambdaAsset().name).toBe('skuba:lambda-asset'));

  it.each(['es', 'cjs', 'iife', 'umd'])(
    'writes an ESM package.json for output format %p',
    async (format) => {
      await writeBundle(lambdaAsset(), {
        dir: outputDir,
        format: format as NormalizedOutputOptions['format'],
      });

      await expect(readOutputPackageJson()).resolves.toEqual({
        type: 'module',
      });
    },
  );

  it('does not install anything without nodeModules', async () => {
    await writeBundle(lambdaAsset(), { dir: outputDir, format: 'es' });

    await expect(fs.promises.readdir(outputDir)).resolves.toEqual([
      'package.json',
    ]);
    expect(install).not.toHaveBeenCalled();
  });

  it('throws when the config uses output.file instead of output.dir', async () => {
    await expect(
      writeBundle(lambdaAsset(), { file: 'lib/lambda.js', format: 'es' }),
    ).rejects.toThrow(/requires `output\.dir`/);
  });

  it('prepares a given output directory only once per build', async () => {
    const plugin = lambdaAsset();
    const packageJson = path.join(outputDir, 'package.json');

    await writeBundle(plugin, { dir: outputDir, format: 'es' });
    await fs.remove(packageJson);
    await writeBundle(plugin, { dir: outputDir, format: 'es' });

    await expect(pathExists(packageJson)).resolves.toBe(false);
  });

  it('prepares the output directory again on a subsequent build', async () => {
    const plugin = lambdaAsset();
    const packageJson = path.join(outputDir, 'package.json');

    await writeBundle(plugin, { dir: outputDir, format: 'es' });
    await fs.remove(packageJson);

    await buildStart(plugin);
    await writeBundle(plugin, { dir: outputDir, format: 'es' });

    await expect(pathExists(packageJson)).resolves.toBe(true);
  });

  describe('nodeModules', () => {
    let workspaceRoot: string;
    let depsLockFilePath: string;

    /** Files present in the output directory when the install ran. */
    let stagedDuringInstall: string[];

    const installModule = async (
      dir: string,
      name: string,
      version: string,
    ) => {
      const modDir = path.join(dir, 'node_modules', name);
      await fs.promises.mkdir(modDir, { recursive: true });
      await fs.promises.writeFile(
        path.join(modDir, 'package.json'),
        JSON.stringify({ name, version }),
      );
    };

    /** Stand in for what `pnpm install` leaves behind. */
    const writePnpmOutput = async () => {
      const nodeModules = path.join(outputDir, 'node_modules');
      await fs.promises.mkdir(path.join(nodeModules, 'sharp'), {
        recursive: true,
      });
      await fs.promises.writeFile(
        path.join(nodeModules, '.modules.yaml'),
        'storeDir: /Users/someone/Library/pnpm/store/v10\n',
      );
      await fs.promises.writeFile(
        path.join(nodeModules, '.pnpm-workspace-state-v1.json'),
        '{"lastValidatedTimestamp":1}',
      );
    };

    beforeEach(async () => {
      workspaceRoot = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'lambda-project-'),
      );
      depsLockFilePath = path.join(workspaceRoot, 'pnpm-lock.yaml');

      stagedDuringInstall = [];
      install.mockImplementation(async () => {
        stagedDuringInstall = (await fs.promises.readdir(outputDir)).sort();
        await writePnpmOutput();
      });
    });

    afterEach(() => fs.remove(workspaceRoot));

    it('throws when the configured depsLockFilePath does not exist', () =>
      expect(
        writeBundle(lambdaAsset({ nodeModules: ['sharp'], depsLockFilePath }), {
          dir: outputDir,
          format: 'es',
        }),
      ).rejects.toThrow(/cannot find a pnpm-lock\.yaml at/));

    it('throws when projectRoot has no package.json', async () => {
      await fs.promises.writeFile(depsLockFilePath, '');

      await expect(
        writeBundle(
          lambdaAsset({
            nodeModules: ['sharp'],
            depsLockFilePath,
            projectRoot: workspaceRoot,
          }),
          { dir: outputDir, format: 'es' },
        ),
      ).rejects.toThrow(/cannot find a package\.json/);
    });

    it('throws before installing when a nodeModules entry cannot be resolved', async () => {
      await fs.promises.writeFile(depsLockFilePath, '');
      await fs.promises.writeFile(
        path.join(workspaceRoot, 'package.json'),
        '{}',
      );

      await expect(
        writeBundle(
          lambdaAsset({
            nodeModules: ['__nonexistent_module__'],
            depsLockFilePath,
            projectRoot: workspaceRoot,
          }),
          { dir: outputDir, format: 'es' },
        ),
      ).rejects.toThrow(/Cannot extract version for module/);

      expect(install).not.toHaveBeenCalled();
    });

    describe('with a staged workspace', () => {
      beforeEach(async () => {
        await fs.promises.writeFile(depsLockFilePath, 'lockfileVersion: 9.0\n');
        await fs.promises.writeFile(
          path.join(workspaceRoot, 'package.json'),
          JSON.stringify({ packageManager: 'pnpm@10.34.5' }),
        );
        await fs.promises.writeFile(
          path.join(workspaceRoot, '.npmrc'),
          '//registry.npmjs.org/:_authToken=secret\n',
        );
        await fs.promises.writeFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'packages: []\n',
        );
        await installModule(workspaceRoot, 'sharp', '0.34.6');
      });

      const prepare = () =>
        writeBundle(
          lambdaAsset({
            nodeModules: ['sharp'],
            depsLockFilePath,
            projectRoot: workspaceRoot,
          }),
          { dir: outputDir, format: 'es' },
        );

      it('writes dependencies and the packageManager pin', async () => {
        await prepare();

        await expect(readOutputPackageJson()).resolves.toEqual({
          type: 'module',
          dependencies: { sharp: '0.34.6' },
          packageManager: 'pnpm@10.34.5',
        });
      });

      it('stages the workspace config and lock file for the install', async () => {
        await prepare();

        expect(stagedDuringInstall).toEqual([
          '.npmrc',
          'package.json',
          'pnpm-lock.yaml',
          'pnpm-workspace.yaml',
        ]);
      });

      it('strips the install-only files and pnpm metadata afterwards', async () => {
        await prepare();

        await expect(
          fs.promises.readdir(outputDir).then((files) => files.sort()),
        ).resolves.toEqual(['node_modules', 'package.json']);

        for (const file of [
          'node_modules/.modules.yaml',
          'node_modules/.pnpm-workspace-state-v1.json',
        ]) {
          await expect(pathExists(path.join(outputDir, file))).resolves.toBe(
            false,
          );
        }

        // The installed dependency itself must survive.
        await expect(
          pathExists(path.join(outputDir, 'node_modules', 'sharp')),
        ).resolves.toBe(true);
      });

      it('strips the install-only files when the install fails', async () => {
        install.mockRejectedValue(new Error('pnpm exploded'));

        await expect(prepare()).rejects.toThrow('pnpm exploded');

        await expect(pathExists(path.join(outputDir, '.npmrc'))).resolves.toBe(
          false,
        );
      });

      it('keeps stripping, and reports, when one removal fails', async () => {
        const remove = vi
          .spyOn(fs, 'remove')
          .mockRejectedValueOnce(new Error('EPERM'));

        try {
          await expect(prepare()).rejects.toThrow(
            /could not strip install-only files/,
          );

          // The failure must not have skipped the credential file.
          await expect(
            pathExists(path.join(outputDir, '.npmrc')),
          ).resolves.toBe(false);
        } finally {
          remove.mockRestore();
        }
      });
    });

    describe('in a workspace', () => {
      let packageRoot: string;

      beforeEach(async () => {
        packageRoot = path.join(workspaceRoot, 'packages', 'worker');
        await fs.promises.mkdir(packageRoot, { recursive: true });

        await fs.promises.writeFile(depsLockFilePath, 'lockfileVersion: 9.0\n');
        await fs.promises.writeFile(
          path.join(workspaceRoot, 'package.json'),
          JSON.stringify({ packageManager: 'pnpm@10.34.5' }),
        );
        await fs.promises.writeFile(
          path.join(workspaceRoot, 'pnpm-workspace.yaml'),
          'packages:\n  - packages/*\n',
        );
        await fs.promises.writeFile(
          path.join(packageRoot, 'package.json'),
          JSON.stringify({ name: 'worker' }),
        );

        // pnpm installs a workspace package's dependencies under that package.
        await installModule(packageRoot, 'sharp', '0.34.6');
      });

      it('resolves versions from projectRoot and stages config from the lock file directory', async () => {
        await writeBundle(
          lambdaAsset({
            nodeModules: ['sharp'],
            depsLockFilePath,
            projectRoot: packageRoot,
          }),
          { dir: outputDir, format: 'es' },
        );

        await expect(readOutputPackageJson()).resolves.toEqual({
          type: 'module',
          dependencies: { sharp: '0.34.6' },
          packageManager: 'pnpm@10.34.5',
        });

        expect(stagedDuringInstall).toContain('pnpm-workspace.yaml');
      });
    });
  });
});
