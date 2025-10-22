import fs from 'fs-extra';
import type { PackageJson } from 'read-pkg-up';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../../utils/logging.js';
import { getConsumerManifest } from '../../../../utils/manifest.js';
import { getSkubaVersion } from '../../../../utils/version.js';

import { upgradeSkuba } from './index.js';

vi.mock('../../../../utils/manifest');
vi.mock('../../../../utils/version');
vi.mock('fs-extra');
vi.mock('../../../../utils/logging');

beforeEach(() => {
  vi.clearAllMocks();
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
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('should apply patches which are equal to or greater than the manifest version', async () => {
    const mockUpgrade = {
      apply: vi.fn().mockImplementation(() => ({ result: 'apply' })),
      description: 'mock',
    };

    vi.mock(`./patches/7.3.1/index.js`, () => ({ patches: [mockUpgrade] }));
    vi.mock(`./patches/8.0.0/index.js`, () => ({ patches: [mockUpgrade] }));
    vi.mock(`./patches/8.2.1/index.js`, () => ({ patches: [mockUpgrade] }));

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '8.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '7.3.1' },
      { isDirectory: () => true, name: '8.0.0' },
      { isDirectory: () => true, name: '8.2.1' },
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

    vi.mock(`./patches/8.2.1/index.js`, () => ({ patches: [mockUpgrade] }));

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '8.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '8.2.1' },
    ] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "8.2.1"
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

    vi.mock(`./patches/8.2.1/index.js`, () => ({ patches: [mockUpgrade] }));

    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '8.2.1' },
    ] as never);

    await expect(upgradeSkuba('format', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "8.2.1"
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
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });

    expect(fs.readdir).not.toHaveBeenCalled();
  });

  it('should return ok: false, fixable: true if there are lints to apply', async () => {
    vi.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '1.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    // readdir has overloads and the mocked version doesn't match the string version
    vi.mocked(fs.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '7.3.1' },
      { isDirectory: () => true, name: '8.0.0' },
      { isDirectory: () => true, name: '8.2.1' },
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
      } as PackageJson,
      path: '/package.json',
    });

    vi.mocked(getSkubaVersion).mockResolvedValue('8.2.1');

    vi.mocked(fs.readdir).mockResolvedValue([
      { isDirectory: () => true, name: '7.3.1' },
    ] as never);

    await expect(upgradeSkuba('lint', log)).resolves.toEqual({
      ok: true,
      fixable: false,
    });
  });
});
