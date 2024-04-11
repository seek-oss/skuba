import fg from 'fast-glob';
import { readFile, writeFile } from 'fs-extra';
import type { NormalizedPackageJson } from 'read-pkg-up';

import type { PatchConfig } from '../..';
import type { PackageManagerConfig } from '../../../../../../utils/packageManager';

import { tryPatchPnpmPackageManager } from './patchPnpmPackageManager';

jest.mock('fast-glob');
jest.mock('fs-extra');

describe('patchPnpmPackageManager', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if we are not using pnpm', async () => {
    await expect(
      tryPatchPnpmPackageManager({
        mode: 'format',
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
        mode: 'format',
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
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'Either dockerfiles or pipelines were not found',
    });
  });

  it('should skip if no buildkite pipelines are found', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce([]);
    await expect(
      tryPatchPnpmPackageManager({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'Either dockerfiles or pipelines were not found',
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
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no pipeline or dockerfiles to patch',
    });
  });

  it('should patch both dockerfiles and pipelines', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['.buildkite/pipeline.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.7\n' +
          'FROM --platform=arm64 node:20-alpine AS dev-deps\n\n' +
          'RUN corepack enable pnpm\n') as never,
      )
      .mockResolvedValueOnce(
        ('seek-oss/docker-ecr-cache#v2.1.0:\n' +
          '      cache-on:\n' +
          '        - .npmrc\n' +
          '        - pnpm-lock.yaml\n') as never,
      );

    await expect(
      tryPatchPnpmPackageManager({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      1,
      'Dockerfile',
      ('# syntax=docker/dockerfile:1.7\n' +
        'FROM --platform=arm64 node:20-alpine AS dev-deps\n\n' +
        'RUN --mount=type=bind,source=package.json,target=package.json \\\n' +
        '  corepack enable pnpm && corepack install\n') as never,
    );

    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '.buildkite/pipeline.yml',
      ('seek-oss/docker-ecr-cache#v2.2.0:\n' +
        '      cache-on:\n' +
        '        - .npmrc\n' +
        '        - package.json#.packageManager\n' +
        '        - pnpm-lock.yaml\n') as never,
    );
  });

  it('should not patch in lint mode', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['.buildkite/pipeline.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.7\n' +
          'FROM --platform=arm64 node:20-alpine AS dev-deps\n\n' +
          'RUN corepack enable pnpm\n') as never,
      )
      .mockResolvedValueOnce(
        ('seek-oss/docker-ecr-cache#v2.1.0:\n' +
          '      cache-on:\n' +
          '        - .npmrc\n' +
          '        - pnpm-lock.yaml\n') as never,
      );

    await expect(
      tryPatchPnpmPackageManager({
        mode: 'lint',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).not.toHaveBeenCalled();
  });

  it('should patch multiple cache entries in pipelines', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['.buildkite/pipeline.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.7\n' +
          'FROM --platform=arm64 node:20-alpine AS dev-deps\n\n' +
          'RUN corepack enable pnpm\n') as never,
      )
      .mockResolvedValueOnce(
        ('seek-oss/docker-ecr-cache#v2.1.0:\n' +
          '      cache-on:\n' +
          '        - .npmrc\n' +
          '        - pnpm-lock.yaml\n' +
          'seek-oss/docker-ecr-cache#v2.1.0:\n' +
          '      cache-on:\n' +
          '        - .npmrc\n' +
          '        - pnpm-lock.yaml\n') as never,
      );

    await expect(
      tryPatchPnpmPackageManager({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '.buildkite/pipeline.yml',
      ('seek-oss/docker-ecr-cache#v2.2.0:\n' +
        '      cache-on:\n' +
        '        - .npmrc\n' +
        '        - package.json#.packageManager\n' +
        '        - pnpm-lock.yaml\n' +
        'seek-oss/docker-ecr-cache#v2.2.0:\n' +
        '      cache-on:\n' +
        '        - .npmrc\n' +
        '        - package.json#.packageManager\n' +
        '        - pnpm-lock.yaml\n') as never,
    );
  });

  it('should avoid patching the docker ecr cache plugin version if it is greater than 2.2.0', async () => {
    jest
      .mocked(fg)
      .mockResolvedValueOnce(['Dockerfile'])
      .mockResolvedValueOnce(['.buildkite/pipeline.yml']);
    jest
      .mocked(readFile)
      .mockResolvedValueOnce(
        ('# syntax=docker/dockerfile:1.7\n' +
          'FROM --platform=arm64 node:20-alpine AS dev-deps\n\n' +
          'RUN corepack enable pnpm\n') as never,
      )
      .mockResolvedValueOnce(
        ('seek-oss/docker-ecr-cache#v2.3.0:\n' +
          '      cache-on:\n' +
          '        - .npmrc\n' +
          '        - pnpm-lock.yaml\n') as never,
      );

    await expect(
      tryPatchPnpmPackageManager({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
        manifest: validManifest,
      } as PatchConfig),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      '.buildkite/pipeline.yml',
      ('seek-oss/docker-ecr-cache#v2.3.0:\n' +
        '      cache-on:\n' +
        '        - .npmrc\n' +
        '        - package.json#.packageManager\n' +
        '        - pnpm-lock.yaml\n') as never,
    );
  });
});
