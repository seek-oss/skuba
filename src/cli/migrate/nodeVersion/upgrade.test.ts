import path from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../testing/memfs.js';
import type { PatchReturnType } from '../../lint/internalLints/upgrade/index.js';

import { upgradeInfraPackages } from './upgrade.js';

vi.mock('@skuba-lib/api', async () => {
  const actual =
    await vi.importActual<typeof import('@skuba-lib/api')>('@skuba-lib/api');

  return {
    ...actual,
    Git: {
      ...actual.Git,
      findRoot: vi.fn(({ dir }: { dir: string }) => Promise.resolve(dir)),
    },
  };
});

import { Git } from '@skuba-lib/api';

vi.mock('fs-extra', () => ({
  ...memfs,
  default: memfs,
}));

vi.mock('../../../utils/exec.js');

vi.spyOn(console, 'error').mockImplementation(() => undefined);
vi.spyOn(console, 'log').mockImplementation(() => undefined);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
});

describe('upgradeInfraPackages', () => {
  it('should update all packages specified in a root package.json file', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.0.0',
            serverless: '4.0.0',
            osls: '3.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
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
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
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
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.0.0',
            serverless: '4.26.0',
            osls: '3.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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

  it('should avoid updating packages with ^ and ~ versions which are up to date', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '^2.232.1',
            serverless: '~4.26.0',
            osls: '3.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '^2.232.1',
          serverless: '~4.26.0',
          osls: '3.61.0',
        },
      }),
    });
  });

  it('should handle ^ and ~ prefixes when updating versions', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '^1.0.0',
            serverless: '~3.0.0',
            osls: '3.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '^3.0.0',
            serverless: '~4.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.x',
            serverless: '4.2.x',
            osls: '3.X.X',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.0.0 - 2.999.0',
            serverless: '4.0.0 - 5.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '>=2.0.0',
            serverless: '>3.0.0',
            osls: '<5.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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

  it('should avoid converting comparison ranges that already meet the target version', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '>=2.250.0',
            serverless: '>4.30.0',
            osls: '>=3.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '>=2.250.0',
          serverless: '>4.30.0',
          osls: '^3.61.0',
        },
      }),
    });
  });

  it('should avoid downgrading x ranges that are already newer', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.250.x',
            serverless: '4.30.X',
            osls: '3.0.x',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.250.x',
          serverless: '4.30.X',
          osls: '^3.61.0',
        },
      }),
    });
  });

  it('should avoid downgrading hyphen ranges that are already newer', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            'aws-cdk-lib': '2.250.0 - 3.0.0',
            serverless: '4.30.0 - 5.0.0',
            osls: '3.0.0 - 4.0.0',
          },
        }),
      },
      process.cwd(),
    );

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          'aws-cdk-lib': '2.250.0 - 3.0.0',
          serverless: '4.30.0 - 5.0.0',
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
      vol.fromJSON(
        {
          'package.json': JSON.stringify({
            dependencies: {
              'aws-cdk-lib': currentVersion,
              serverless: '4.0.0',
            },
          }),
        },
        process.cwd(),
      );

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
      ).resolves.toEqual({
        result: 'apply',
      } satisfies PatchReturnType);

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

  it('should read manifests from the git root when cwd is a workspace package', async () => {
    const repoRoot = path.join(process.cwd(), 'repo');
    const packageDir = path.join(repoRoot, 'packages/api');

    vi.mocked(Git.findRoot).mockResolvedValueOnce(repoRoot);

    vol.fromJSON(
      {
        'package.json': JSON.stringify({
          dependencies: {
            serverless: '4.0.0',
          },
        }),
        'packages/api/package.json': JSON.stringify({
          dependencies: {
            serverless: '4.0.0',
          },
        }),
      },
      repoRoot,
    );

    await expect(
      upgradeInfraPackages(
        'format',
        [
          {
            name: 'serverless',
            version: '4.25.0',
          },
        ],
        packageDir,
      ),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(vol.toJSON(repoRoot, undefined, true)).toEqual({
      'package.json': JSON.stringify({
        dependencies: {
          serverless: '4.25.0',
        },
      }),
      'packages/api/package.json': JSON.stringify({
        dependencies: {
          serverless: '4.25.0',
        },
      }),
    });
  });
});
