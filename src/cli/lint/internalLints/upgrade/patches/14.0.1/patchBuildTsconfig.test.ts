import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchBuildConfig } from './patchBuildTsconfig.js';

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

describe('patchBuildTsconfig', () => {
  it('skips if no tsconfig.build.json files are found', async () => {
    const result = await patchBuildConfig(baseArgs);

    expect(result).toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no tsconfig.build.json files found',
    });
  });

  it('skips if tsconfig.build.json files already have rootDir', async () => {
    vol.fromJSON(
      {
        'tsconfig.build.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "target": "ES2020"
  }
}
`,
        'packages/api/tsconfig.build.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "target": "ES2020"
  }
}`,
      },
      process.cwd(),
    );
    const result = await patchBuildConfig(baseArgs);

    expect(result).toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no tsconfig.build.json files to patch',
    });
  });

  it("adds 'rootDir' to tsconfig.build.json compilerOptions", async () => {
    vol.fromJSON(
      {
        'tsconfig.build.json': `{
  "compilerOptions": {
    "outDir": "dist",
    "target": "ES2020"
  }
}
`,
        'packages/api/tsconfig.build.json': `{
  "compilerOptions": {
    "outDir": "dist",
    "target": "ES2020"
  }
}`,
      },
      process.cwd(),
    );
    const result = await patchBuildConfig(baseArgs);

    expect(result).toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'tsconfig.build.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "target": "ES2020"
  }
}
`,
      'packages/api/tsconfig.build.json': `{
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "target": "ES2020"
  }
}`,
    });
  });

  it('handles tsconfig.build.json with no compilerOptions', async () => {
    vol.fromJSON(
      {
        'tsconfig.build.json': `{
  "extends": "./tsconfig.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
`,
      },
      process.cwd(),
    );
    const result = await patchBuildConfig(baseArgs);

    expect(result).toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'tsconfig.build.json': `{
  "compilerOptions": {
    "rootDir": "src"
  },
  "extends": "./tsconfig.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
`,
    });
  });
});
