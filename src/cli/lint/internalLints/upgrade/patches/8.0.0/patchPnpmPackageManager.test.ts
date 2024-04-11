import fg from 'fast-glob';
import { readFile } from 'fs-extra';
import type { NormalizedPackageJson } from 'read-pkg-up';

import type { PatchConfig } from '../..';
import type { PackageManagerConfig } from '../../../../../../utils/packageManager';

import { tryPatchPnpmPackageManager } from './patchPnpmPackageManager';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchPnpmPackageManager', () => {
  it('should skip if we are not using pnpm', async () => {
    await expect(
      tryPatchPnpmPackageManager({
        packageManager: { command: 'yarn' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not using pnpm',
    });
  });

  it('should skip if packageManager is not declared in package.json', async () => {
    await expect(
      tryPatchPnpmPackageManager({
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: { packageJson: {} },
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no packageManager declaration in package.json found',
    });
  });

  const validManifest = {
    packageJson: {
      packageManager: 'pnpm',
    } as Partial<NormalizedPackageJson> as NormalizedPackageJson,
    path: '~/project/package.json',
  } as PatchConfig['manifest'];

  it('should skip if no dockerfiles are found', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(['.buldkite/pipeline.yml']);
    await expect(
      tryPatchPnpmPackageManager({
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles or pipelines found',
    });
  });

  it('should skip if no buildkite pipelines are found', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce([]);
    await expect(
      tryPatchPnpmPackageManager({
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfiles or pipelines found',
    });
  });

  it('should skip if dockerfiles and buildkite pipelines do not contain patchable content', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['.buildkite/pipeline.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce('RUN pnpm install' as never)
      .mockResolvedValueOnce('steps:\n  - command: yarn install' as never);

    await expect(
      tryPatchPnpmPackageManager({
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no pipeline or dockerfiles to patch',
    });
  });
});
