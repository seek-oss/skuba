import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../../utils/logging.js';
import { getConsumerManifest } from '../../../../utils/manifest.js';
import { getSkubaVersion } from '../../../../utils/version.js';

import { type Patches, upgradeSkuba } from './index.js';

vi.mock('../../../../utils/manifest');
vi.mock('../../../../utils/version');
vi.mock('fs-extra');
vi.mock('../../../../utils/logging');

const { patchesByVersion } = vi.hoisted(() => ({
  patchesByVersion: new Map<string, Patches>(),
}));

// `getPatches` imports each patch module dynamically. Mocking them up front
// keeps the mocks independent of how those imports resolve, and of the order in
// which Vitest runs our tests and test files. The getters let each test set its
// own patches, as a mocked module is only instantiated once.
/* eslint-disable no-restricted-syntax */
vi.mock('./patches/12.0.2/index.js', () => ({
  get patches() {
    return patchesByVersion.get('12.0.2') ?? [];
  },
}));
vi.mock('./patches/12.1.1/index.js', () => ({
  get patches() {
    return patchesByVersion.get('12.1.1') ?? [];
  },
}));
vi.mock('./patches/13.1.1/index.js', () => ({
  get patches() {
    return patchesByVersion.get('13.1.1') ?? [];
  },
}));
vi.mock('./patches/14.0.1/index.js', () => ({
  get patches() {
    return patchesByVersion.get('14.0.1') ?? [];
  },
}));
/* eslint-enable no-restricted-syntax */

beforeEach(() => {
  vi.clearAllMocks();

  patchesByVersion.clear();
});

describe('upgradeSkuba in format mode', () => {
  it('should throw an error if no skuba manifest can be found', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue(undefined);

    await expect(upgradeSkuba('format', log)).rejects.toThrow(
      'Could not find a package json for this project',
    );
  });

  it('should return early if the skuba manifest version is greater than or equal to the skuba current version', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '8.2.1',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.promises.readdir).not.toHaveBeenCalled();
  });

  it('should apply patches which are equal to or greater than the manifest version', async () => {
    const mockUpgrade = {
      apply: vi.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    patchesByVersion.set('12.0.2', [mockUpgrade]);
    patchesByVersion.set('13.1.1', [mockUpgrade]);
    patchesByVersion.set('14.0.1', [mockUpgrade]);

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '13.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('13.1.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '12.0.2' },
      { isDirectory: () => true, name: '13.1.1' },
      { isDirectory: () => true, name: '14.0.1' },
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
      apply: vi.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    patchesByVersion.set('13.1.1', [mockUpgrade]);

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '13.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('13.1.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '13.1.1' },
    ] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "13.1.1"
  }
}
`,
    );
  });

  it('should handle skuba section not being present in the packageJson', async () => {
    const mockUpgrade = {
      apply: vi.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    patchesByVersion.set('12.0.2', [mockUpgrade]);

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('13.1.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '12.0.2' },
    ] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.promises.writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "13.1.1"
  }
}
`,
    );
  });
});

describe('upgradeSkuba in lint mode', () => {
  it('should throw an error if no skuba manifest can be found', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue(undefined);

    await expect(upgradeSkuba('lint', log)).rejects.toThrow(
      'Could not find a package json for this project',
    );
  });

  it('should return early if the skuba manifest version is greater than or equal to the skuba current version', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '8.2.1',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.promises.readdir).not.toHaveBeenCalled();
  });

  it('should return ok: false, fixable: true if there are lints to apply', async () => {
    patchesByVersion.set('13.1.1', [
      {
        apply: vi.fn().mockImplementation(() => ({ result: 'apply' })),
        description: 'mock',
      },
    ]);

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '1.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('13.1.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '12.0.2' },
      { isDirectory: () => true, name: '12.1.1' },
      { isDirectory: () => true, name: '13.1.1' },
    ] as never);

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: false,
      fixable: true,
      annotations: [
        {
          message:
            'skuba has patches to apply. Run pnpm exec skuba format to run them.',
          path: '/package.json',
        },
      ],
    });
  });

  it('should return ok: true, fixable: false if there are no lints to apply despite package.json being out of date', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '8.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      },
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    vi.mocked(fs.promises.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '7.3.1' },
    ] as never);

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });
  });
});
