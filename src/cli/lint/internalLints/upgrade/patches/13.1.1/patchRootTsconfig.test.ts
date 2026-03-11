import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchRootConfig } from './patchRootTsconfig.js';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));
vi.mock('fast-glob', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('fast-glob')>();
  const globWithMemfs = (pat: string, opts: Record<string, unknown>) =>
    actual.glob(pat, { ...opts, fs: memfs } as Parameters<typeof actual.glob>[1]);
  return {
    ...actual,
    default: globWithMemfs,
    glob: globWithMemfs,
  };
});

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

beforeEach(() => {
  vol.reset();
  vi.clearAllMocks();
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
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no root tsconfig.json found',
    } satisfies PatchReturnType);
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
    ).resolves.toEqual({
      result: 'skip',
      reason: 'Unable to parse tsconfig.json',
    } satisfies PatchReturnType);
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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
    ).resolves.toEqual({
      result: 'skip',
      reason: 'rootDir already set in tsconfig.json',
    } satisfies PatchReturnType);
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
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

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
