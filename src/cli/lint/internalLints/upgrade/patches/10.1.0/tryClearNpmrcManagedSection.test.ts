import memfs, { vol } from 'memfs';

import type { PatchConfig } from '../..';
import { configForPackageManager } from '../../../../../../utils/packageManager';

import { tryClearNpmrcManagedSection } from './tryClearNpmrcManagedSection';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);

beforeEach(() => vol.reset());

const baseArgs = {
  manifest: {} as PatchConfig['manifest'],
  packageManager: configForPackageManager('pnpm'),
};

afterEach(() => jest.resetAllMocks());

describe.each(['lint', 'format'] as const)('%s', (mode) => {
  it('should skip if not using pnpm', async () => {
    await expect(
      tryClearNpmrcManagedSection({
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
      tryClearNpmrcManagedSection({
        ...baseArgs,
        mode,
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no .npmrc found',
    });

    expect(volToJson()).toEqual({});
  });

  it('should skip if no managed section to clear', async () => {
    const input = `
# This is a comment
# Another comment`;

    vol.fromJSON({
      '.npmrc': input,
    });

    await expect(
      tryClearNpmrcManagedSection({
        ...baseArgs,
        mode,
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no managed section to clear',
    });

    expect(volToJson()).toEqual({
      '.npmrc': input,
    });
  });

  it('should clear the managed section', async () => {
    const inputVolume = {
      '.npmrc': `
    # managed by skuba
package-manager-strict-version=true
public-hoist-pattern[]="@types*"
public-hoist-pattern[]="*eslint*"
public-hoist-pattern[]="*prettier*"
public-hoist-pattern[]="esbuild"
public-hoist-pattern[]="jest"
public-hoist-pattern[]="tsconfig-seek"
# end managed by skuba
`,
    };
    vol.fromJSON(inputVolume);

    await expect(
      tryClearNpmrcManagedSection({
        ...baseArgs,
        mode,
      }),
    ).resolves.toEqual({
      result: 'apply',
    });
    expect(volToJson()).toEqual(
      mode === 'lint'
        ? inputVolume
        : {
            '.npmrc': `
`,
          },
    );
  });
});
