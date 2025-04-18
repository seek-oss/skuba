import memfs, { vol } from 'memfs';

import type { PatchConfig } from '../..';
import { configForPackageManager } from '../../../../../../utils/packageManager';

import { tryMigrateNpmrcToPnpmWorkspace } from './migrateNpmrcToPnpmWorkspace';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);

beforeEach(() => vol.reset());

const baseArgs = {
  manifest: {} as PatchConfig['manifest'],
  packageManager: configForPackageManager('pnpm'),
};

afterEach(() => jest.resetAllMocks());

const basicTests = (mode: 'lint' | 'format') => {
  it('should skip if not using pnpm', async () => {
    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode,
        packageManager: configForPackageManager('yarn'),
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not using pnpm',
    });

    expect(volToJson()).toEqual({});
  });

  it('should skip if npmrc not found', async () => {
    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode,
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no .npmrc found',
    });

    expect(volToJson()).toEqual({});
  });
};

describe('lint', () => {
  basicTests('lint');

  it('should mark as apply if npmrc exists', async () => {
    vol.fromJSON({
      '.npmrc': '',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      '.npmrc': '',
    });
  });
});

describe('format', () => {
  basicTests('format');

  it('should perform a skuba-only migration', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n\n\n\n\n\n\n# some comment\n\n\n\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({});
  });

  it('should migrate custom settings', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\nsome-setting=12345\n#ignore me\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# some-setting=12345

`,
    });
  });

  it('should skip migrating a secret', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n_auth=12345\n#ignore me\nother-setting=12345\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# other-setting=12345

`,
    });
  });

  it('should prepend extra settings to the top of an existing pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\nsome-setting=12345\n#ignore me\n',
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# some-setting=12345

packages:
  - "packages/*"
`,
    });
  });

  it('should leave pnpm-workspace.yaml alone if there are no settings to migrate', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n#ignore me\n',
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });
  });
});
