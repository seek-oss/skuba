import memfs, { vol } from 'memfs';

import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

import { upgradeInfraPackages } from './upgrade.js';

jest.mock('fs', () => memfs);

jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

jest.mock('../../../utils/exec.js');

jest.spyOn(console, 'error').mockImplementation(() => {
  /* empty */
});
jest.spyOn(console, 'log').mockImplementation(() => {
  /* empty */
});

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
});

describe('upgradeInfraPackages', () => {
  it('should update all packages specified in a root package.json file', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0',
          serverless: '4.0.0',
          osls: '3.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.224.0',
          serverless: '4.25.0',
          osls: '3.61.0',
        },
      }),
    });
  });

  it('should update all packages specified in multiple package.json file', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0',
          serverless: '4.0.0',
          osls: '3.0.0',
        },
      }),
      'packages/package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0',
          serverless: '4.0.0',
          osls: '3.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.224.0',
          serverless: '4.25.0',
          osls: '3.61.0',
        },
      }),
      'packages/package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.224.0',
          serverless: '4.25.0',
          osls: '3.61.0',
        },
      }),
    });
  });

  it('should update all packages specified in package.json and pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0',
          serverless: '4.0.0',
          osls: '3.0.0',
        },
      }),
      'pnpm-workspace.yaml': `
packages:
  - 'packages/*'
  - 'libs/*'
  
catalog:
  aws-cdk-lib: 2.0.0
  serverless: 4.0.0
  osls: 3.0.0

catalogs:
  foo:
    aws-cdk-lib: 2.0.0
    serverless: 4.0.0
    osls: 3.0.0
`,
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.224.0',
          serverless: '4.25.0',
          osls: '3.61.0',
        },
      }),
      'pnpm-workspace.yaml': `
packages:
  - 'packages/*'
  - 'libs/*'
  
catalog:
  aws-cdk-lib: 2.224.0
  serverless: 4.25.0
  osls: 3.61.0

catalogs:
  foo:
    aws-cdk-lib: 2.224.0
    serverless: 4.25.0
    osls: 3.61.0
`,
    });
  });

  it('should avoid updating packages which are up to date', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0',
          serverless: '4.26.0',
          osls: '3.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.224.0',
          serverless: '4.26.0',
          osls: '3.61.0',
        },
      }),
    });
  });

  it('should handle ^ and ~ prefixes when updating versions', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^1.0.0',
          serverless: '~3.0.0',
          osls: '3.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^2.224.0',
          serverless: '~4.25.0',
          osls: '3.61.0',
        },
      }),
    });
  });

  it('should update ^ and ~ ranges even when they already satisfy the version', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^3.0.0',
          serverless: '~4.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '3.1.0',
        },
        {
          name: 'serverless',
          version: '4.0.5',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^3.1.0',
          serverless: '~4.0.5',
        },
      }),
    });
  });

  it('should convert x ranges to caret ranges', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.x',
          serverless: '4.2.x',
          osls: '3.X.X',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^2.224.0',
          serverless: '^4.25.0',
          osls: '^3.61.0',
        },
      }),
    });
  });

  it('should convert hyphen ranges to caret ranges', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.0.0 - 2.999.0',
          serverless: '4.0.0 - 5.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^2.224.0',
          serverless: '^4.25.0',
        },
      }),
    });
  });

  it('should convert comparison ranges to caret ranges', async () => {
    vol.fromJSON({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '>=2.0.0',
          serverless: '>3.0.0',
          osls: '<5.0.0',
        },
      }),
    });

    await expect(
      upgradeInfraPackages('format', [
        {
          name: 'aws-cdk-lib',
          version: '2.224.0',
        },
        {
          name: 'serverless',
          version: '4.25.0',
        },
        {
          name: 'osls',
          version: '3.61.0',
        },
      ]),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^2.224.0',
          serverless: '^4.25.0',
          osls: '^3.61.0',
        },
      }),
    });
  });

  it.each([
    ['*'],
    ['workspace:*'],
    ['workspace:^'],
    ['link:./local-package'],
    ['file:./local-package'],
    ['catalog:'],
    ['catalog:default'],
  ])(
    'should not update packages with special version specifier: %s',
    async (currentVersion) => {
      vol.fromJSON({
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': currentVersion,
            serverless: '4.0.0',
          },
        }),
      });

      await expect(
        upgradeInfraPackages('format', [
          {
            name: 'aws-cdk-lib',
            version: '2.224.0',
          },
          {
            name: 'serverless',
            version: '4.25.0',
          },
        ]),
      ).resolves.toEqual<PatchReturnType>({
        result: 'apply',
      });

      expect(volToJson()).toEqual({
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': currentVersion,
            serverless: '4.25.0',
          },
        }),
      });
    },
  );
});
