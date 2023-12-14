import { readdir, writeFile } from 'fs-extra';
import type { NormalizedPackageJson } from 'read-pkg-up';

import { getConsumerManifest } from '../../../utils/manifest';
import { getSkubaVersion } from '../../../utils/version';

import { upgradeSkuba } from '.';

jest.mock('../../../utils/manifest');
jest.mock('../../../utils/version');
jest.mock('fs-extra');
jest.mock('../../../utils/logging');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('upgradeSkuba', () => {
  it('should throw an error if no skuba manifest can be found', async () => {
    jest.mocked(getConsumerManifest).mockResolvedValue(undefined);

    await expect(upgradeSkuba()).rejects.toThrow(
      'Could not find a package json for this project',
    );
  });

  it('should return early if the skuba manifest version is greater than or equal to the skuba current version', async () => {
    jest.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '2.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as NormalizedPackageJson,
      path: '/package.json',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    await expect(upgradeSkuba()).resolves.toBeUndefined();

    expect(readdir).not.toHaveBeenCalled();
  });

  it('should apply patches which are equal to or greater than the manifest version', async () => {
    const mockUpgrade = {
      upgrade: jest.fn(),
    };

    jest.mock(`./patches/0.9.0/index.js`, () => mockUpgrade, {
      virtual: true,
    });
    jest.mock(`./patches/1.0.0/index.js`, () => mockUpgrade, {
      virtual: true,
    });
    jest.mock(`./patches/2.0.0/index.js`, () => mockUpgrade, {
      virtual: true,
    });

    jest.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '1.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as NormalizedPackageJson,
      path: '/package.json',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest
      .mocked(readdir)
      .mockResolvedValue(['0.9.0', '1.0.0', '2.0.0'] as never);

    await expect(upgradeSkuba()).resolves.toBeUndefined();
    expect(mockUpgrade.upgrade).toHaveBeenCalledTimes(2);
  });

  it('should update the consumer manifest version', async () => {
    const mockUpgrade = {
      upgrade: jest.fn(),
    };

    jest.mock(`./patches/2.0.0/index.js`, () => mockUpgrade, {
      virtual: true,
    });

    jest.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        skuba: {
          version: '1.0.0',
        },
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as NormalizedPackageJson,
      path: '/package.json',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest.mocked(readdir).mockResolvedValue(['2.0.0'] as never);

    await expect(upgradeSkuba()).resolves.toBeUndefined();

    expect(writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "2.0.0"
  }
}
`,
    );
  });

  it('should handle skuba section not being present in the packageJson', async () => {
    const mockUpgrade = {
      upgrade: jest.fn(),
    };

    jest.mock(`./patches/2.0.0/index.js`, () => mockUpgrade, {
      virtual: true,
    });

    jest.mocked(getConsumerManifest).mockResolvedValue({
      packageJson: {
        _id: 'test',
        name: 'some-api',
        readme: '',
        version: '1.0.0',
      } as NormalizedPackageJson,
      path: '/package.json',
    });

    jest.mocked(getSkubaVersion).mockResolvedValue('2.0.0');

    // readdir has overloads and the mocked version doesn't match the string version
    jest.mocked(readdir).mockResolvedValue(['2.0.0'] as never);

    await expect(upgradeSkuba()).resolves.toBeUndefined();

    expect(writeFile).toHaveBeenCalledWith(
      '/package.json',
      `{
  "name": "some-api",
  "version": "1.0.0",
  "skuba": {
    "version": "2.0.0"
  }
}
`,
    );
  });
});
