import fs from 'fs-extra';

import * as dir from '../../../../../../utils/dir.js';
import type { PackageManagerConfig } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { tryPatchPnpmWorkspace } from './patchPnpmWorkspace.js';

jest.mock('fs-extra');
jest.mock('../../../../../../utils/dir.js');

describe('patchPnpmWorkspace', () => {
  afterEach(() => jest.resetAllMocks());

  it('should skip if not using pnpm', async () => {
    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'yarn' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'not using pnpm',
    });

    expect(dir.findWorkspaceRoot).not.toHaveBeenCalled();
    expect(dir.findCurrentWorkspaceProjectRoot).not.toHaveBeenCalled();
  });

  it('should skip if not running in workspace root', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root/packages/app');

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'not running in the workspace root',
    });
  });

  it('should return apply without modifying files in lint mode', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest.mocked(fs.readFile).mockResolvedValue('' as never);

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'lint',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(dir.checkFileExists).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
  });

  it('should create pnpm-workspace.yaml file if it does not exist', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest.mocked(dir.checkFileExists).mockResolvedValue(false);
    jest.mocked(fs.readFile).mockResolvedValue('' as never);

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).toHaveBeenCalledWith('pnpm-workspace.yaml', '');
    expect(fs.writeFile).toHaveBeenCalledWith(
      'pnpm-workspace.yaml',
      `
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@seek/*'
  - '*skuba*'
  - '*seek*'
`,
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(2);
  });

  it('should append configuration to existing pnpm-workspace.yaml file', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest.mocked(dir.checkFileExists).mockResolvedValue(true);
    jest.mocked(fs.readFile).mockResolvedValue(
      `
          # managed by skuba
          packageManagerStrictVersion: true
          publicHoistPattern:
            - '@types*'
            - eslint
            - eslint-config-skuba
            - prettier
            - esbuild
            - jest
            - tsconfig-seek
            - typescript
            # end managed by skuba
            - 'remark-lint-*'
          packages:
            # https://github.com/changesets/changesets/issues/1133#issuecomment-1594844204
            - .
            - packages/*
            - template/*` as never,
    );

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalledWith('pnpm-workspace.yaml', '');
    expect(fs.writeFile).toHaveBeenCalledWith(
      'pnpm-workspace.yaml',
      `
          # managed by skuba
          packageManagerStrictVersion: true
          publicHoistPattern:
            - '@types*'
            - eslint
            - eslint-config-skuba
            - prettier
            - esbuild
            - jest
            - tsconfig-seek
            - typescript
            # end managed by skuba
            - 'remark-lint-*'
          packages:
            # https://github.com/changesets/changesets/issues/1133#issuecomment-1594844204
            - .
            - packages/*
            - template/*
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@seek/*'
  - '*skuba*'
  - '*seek*'
`,
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should handle empty existing pnpm-workspace.yaml file', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest.mocked(dir.checkFileExists).mockResolvedValue(true);
    jest.mocked(fs.readFile).mockResolvedValue('' as never);

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(fs.writeFile).not.toHaveBeenCalledWith('pnpm-workspace.yaml', '');
    expect(fs.writeFile).toHaveBeenCalledWith(
      'pnpm-workspace.yaml',
      `
minimumReleaseAge: 1440
minimumReleaseAgeExclude:
  - '@seek/*'
  - '*skuba*'
  - '*seek*'
`,
    );
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should skip and log error when file operations fail', async () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.checkFileExists)
      .mockRejectedValue(new Error('Permission denied'));

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    await expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'due to an error',
    });

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should skip and log if the pnpm-workspace.yaml file already has a minimumReleaseAge field', () => {
    jest.mocked(dir.findWorkspaceRoot).mockResolvedValue('/workspace/root');
    jest
      .mocked(dir.findCurrentWorkspaceProjectRoot)
      .mockResolvedValue('/workspace/root');
    jest.mocked(dir.checkFileExists).mockResolvedValue(true);
    jest.mocked(fs.readFile).mockResolvedValue(
      `
          # managed by skuba
          packageManagerStrictVersion: true
          publicHoistPattern:
            - '@types*'
            - eslint
            - eslint-config-skuba
            - prettier
            - esbuild
            - jest
            - tsconfig-seek
            - typescript
            # end managed by skuba
            - 'remark-lint-*'
          packages:
            # https://github.com/changesets/changesets/issues/1133#issuecomment-1594844204
            - .
            - packages/*
            - template/*

          minimumReleaseAge: 1440
          minimumReleaseAgeExclude:
            - 'skuba-dive'

          ` as never,
    );

    return expect(
      tryPatchPnpmWorkspace({
        mode: 'format',
        packageManager: { command: 'pnpm' } as PackageManagerConfig,
      } as PatchConfig),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: '`minimumReleaseAge` already exists in pnpm-workspace.yaml',
    });
  });
});
