import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchRootConfig } from './patchRootTsconfig.js';

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

describe('patchRootTsconfig', () => {
  it('should skip if no root tsconfig is found', async () => {
    vol.fromJSON({});

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no root tsconfig.json found',
    });
  });

  it('should skip if unable to parse tsconfig.json', async () => {
    vol.fromJSON({
      'tsconfig.json': `This is not valid JSON`,
    });

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'Unable to parse tsconfig.json',
    });
  });

  it('should preserve comments and formatting when adding rootDir', async () => {
    vol.fromJSON({
      'tsconfig.json': `{
  // This is a comment
  "compilerOptions": {
    /* Multi-line
       comment */
    "module": "commonjs" // Inline comment
  },
  "include": ["src"]
}
`,
    });

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'tsconfig.json': `{
  // This is a comment
  "compilerOptions": {
    "rootDir": ".",
    /* Multi-line
       comment */
    "module": "commonjs" // Inline comment
  },
  "include": ["src"]
}
`,
    });
  });

  it('should add compilerOptions with rootDir if missing', async () => {
    vol.fromJSON({
      'tsconfig.json': `{
  "extends": "./tsconfig.base.json",
  "include": ["src"]
}
`,
    });

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'tsconfig.json': `{
  "compilerOptions": {
    "rootDir": "."
  },
  "extends": "./tsconfig.base.json",
  "include": ["src"]
}
`,
    });
  });

  it('should skip if rootDir is already set', async () => {
    vol.fromJSON({
      'tsconfig.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "module": "commonjs"
  },
  "include": ["src"]
}
`,
    });

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'rootDir already set in tsconfig.json',
    });
  });

  it('should add rootDir to existing compilerOptions', async () => {
    vol.fromJSON({
      'tsconfig.json': `{
  "compilerOptions": {
    "module": "commonjs"
  },
  "include": ["src"]
}
`,
    });

    await expect(
      patchRootConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'tsconfig.json': `{
  "compilerOptions": {
    "rootDir": ".",
    "module": "commonjs"
  },
  "include": ["src"]
}
`,
    });
  });
});
