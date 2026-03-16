import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateTsdown } from './migrateTsdown.js';

jest.mock('../../../../../../utils/exec.js', () => ({
  createExec: () => jest.fn(),
}));

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: string, opts: { ignore: string[] }) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  jest.clearAllMocks();
});

const baseArgs: PatchConfig = {
  manifest: {
    packageJson: {
      name: 'test',
      version: '1.0.0',
      readme: 'README.md',
      _id: 'test',
    },
    path: 'package.json',
  },
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('migrateTsdown', () => {
  it('should skip if no tsdown configs are found', async () => {
    vol.fromJSON({
      'index.ts': '',
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no tsdown.config files found',
    });
  });

  it('should skip if no fields to migrate are found', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'docs',
  attw: true,
  publint: true,
});
      `,
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    });
  });

  it('should migrate fields in tsdown.config.mts', async () => {
    vol.fromJSON({
      'tsdown.config.mts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  external: ['foo'],
  noExternal: ['bar'],
  inlineOnly: true,
  skipNodeModulesBundle: true,
});
      `,
    });

    await expect(
      migrateTsdown({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.mts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig({
        deps: {
          neverBundle: ['foo'],
          alwaysBundle: ['bar'],
          onlyBundle: true,
          skipNodeModulesBundle: true
        },
        failOnWarn: true,
        entry: 'src/index.ts',
        
        
        
        
      });
            ",
      }
    `);
  });
});
