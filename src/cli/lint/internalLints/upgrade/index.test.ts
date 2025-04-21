import { readdir } from 'fs-extra';

import { loadSkubaConfig } from '../../../../config/load';
import { skubaConfigDefault } from '../../../../config/types';
import { updateSkubaConfigVersion } from '../../../../config/update';
import { locateNearestFile } from '../../../../utils/dir';
import { log } from '../../../../utils/logging';
import { getSkubaVersion } from '../../../../utils/version';

import { upgradeSkuba } from '.';

jest.mock('../../../../utils/version');
jest.mock('fs-extra');
jest.mock('../../../../utils/logging');
jest.mock('../../../../utils/dir');
jest.mock('../../../../config/load');
jest.mock('../../../../config/update');

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(locateNearestFile).mockResolvedValue('/package.json');
});

describe('upgradeSkuba in format mode', () => {
  it('should throw an error if no skuba manifest can be found', async () => {
    jest
      .mocked(loadSkubaConfig)
      .mockResolvedValue({ ...skubaConfigDefault, configPath: undefined });
    jest.mocked(locateNearestFile).mockResolvedValue(null);

    await expect(upgradeSkuba('format', log)).rejects.toThrow(
      'Could not find a package json for this project',
    );
  });

  it('should return early if the skuba manifest version is greater than or equal to the skuba current version', async () => {
    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '2.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(readdir).not.toHaveBeenCalled();
  });

  it('should apply patches which are equal to or greater than the manifest version', async () => {
    const mockUpgrade = {
      apply: jest.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    jest.mock(`./patches/0.9.0/index.js`, () => ({ patches: [mockUpgrade] }), {
      virtual: true,
    });
    jest.mock(`./patches/1.0.0/index.js`, () => ({ patches: [mockUpgrade] }), {
      virtual: true,
    });
    jest.mock(`./patches/2.0.0/index.js`, () => ({ patches: [mockUpgrade] }), {
      virtual: true,
    });

    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '1.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest.mocked(readdir).mockResolvedValue([
      { isDirectory: () => true, name: '0.9.0' },
      { isDirectory: () => true, name: '1.0.0' },
      { isDirectory: () => true, name: '2.0.0' },
      { isDirectory: () => false, name: 'index.d.ts' },
    ] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });
    expect(mockUpgrade.apply).toHaveBeenCalledTimes(2);
  });

  it('should update the consumer manifest version', async () => {
    const mockUpgrade = {
      apply: jest.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    jest.mock(`./patches/2.0.0/index.js`, () => ({ patches: [mockUpgrade] }), {
      virtual: true,
    });

    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '1.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest
      .mocked(readdir)
      .mockResolvedValue([{ isDirectory: () => true, name: '2.0.0' }] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(updateSkubaConfigVersion).toHaveBeenCalledWith({
      path: '/skuba.config.ts',
      version: '2.0.0',
    });
  });

  it('should handle version not being present in skuba.config.ts', async () => {
    const mockUpgrade = {
      apply: jest.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    jest.mock(`./patches/2.0.0/index.js`, () => ({ patches: [mockUpgrade] }), {
      virtual: true,
    });

    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      configPath: '/skuba.config.ts',
    });
    jest.mocked(locateNearestFile).mockResolvedValue(null);

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest
      .mocked(readdir)
      .mockResolvedValue([{ isDirectory: () => true, name: '2.0.0' }] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(updateSkubaConfigVersion).toHaveBeenCalledWith({
      path: '/skuba.config.ts',
      version: '2.0.0',
    });
  });
});

describe('upgradeSkuba in lint mode', () => {
  it('should throw an error if no skuba manifest and package.json can be found', async () => {
    jest
      .mocked(loadSkubaConfig)
      .mockResolvedValue({ ...skubaConfigDefault, configPath: undefined });
    jest.mocked(locateNearestFile).mockResolvedValue(null);

    await expect(upgradeSkuba('lint', log)).rejects.toThrow(
      'Could not find a package json for this project',
    );
  });

  it('should return early if the skuba manifest version is greater than or equal to the skuba current version', async () => {
    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '2.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(readdir).not.toHaveBeenCalled();
  });

  it('should return ok: false, fixable: true if there are lints to apply', async () => {
    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '1.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest.mocked(readdir).mockResolvedValue([
      { isDirectory: () => true, name: '0.9.0' },
      { isDirectory: () => true, name: '1.0.0' },
      { isDirectory: () => true, name: '2.0.0' },
    ] as never);

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: false,
      fixable: true,
      annotations: [
        {
          message:
            'skuba has patches to apply. Run pnpm exec skuba format to run them.',
          path: '/skuba.config.ts',
        },
      ],
    });
  });

  it('should return ok: true, fixable: false if there are no lints to apply despite skuba.config.ts being out of date', async () => {
    jest.mocked(loadSkubaConfig).mockResolvedValue({
      ...skubaConfigDefault,
      lastPatchedVersion: '1.0.0',
      configPath: '/skuba.config.ts',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    jest
      .mocked(readdir)
      .mockResolvedValue([{ isDirectory: () => true, name: '0.9.0' }] as never);

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });
  });
});
