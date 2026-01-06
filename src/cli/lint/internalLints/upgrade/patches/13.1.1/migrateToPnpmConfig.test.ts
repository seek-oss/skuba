import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateToPnpmConfig } from './migrateToPnpmConfig.js';

jest.mock('../../../../../../utils/exec.js');
jest.mock('fs', () => memfs);
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

describe('migrateToPnpmConfig', () => {
  it('should skip if no pnpm-workspace.yaml is found', async () => {
    vol.fromJSON({});

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no pnpm-workspace.yaml found',
    });
  });

  it('should skip if pnpm-workspace.yaml has no managed by skuba block', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'skip',
      reason: 'no managed by skuba comment block found',
    });
  });

  it('should not write changes if the mode is lint', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*

# managed by skuba
  something
# end managed by skuba
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*

# managed by skuba
  something
# end managed by skuba
`,
    });
  });

  it('should remove a managed by skuba block', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
  something
# end managed by skuba
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
publicHoistPattern:
  - some-pattern
# end managed by skuba
  - orphan
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:
  - orphan
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found after comments', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
publicHoistPattern:
  - some-pattern
# end managed by skuba
  # some comment describing why
  - orphan
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:
  # some comment describing why
  - orphan
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found after empty paragraphs', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
publicHoistPattern:
  - some-pattern
# end managed by skuba

  - orphan
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:

  - orphan
`,
    });
  });

  it('should not add publicHoistPattern if the next section has its own key', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `# managed by skuba
ignorePatchFailures: false
minimumReleaseAge: 4320 # 3 days
minimumReleaseAgeExclude:
  - '@seek/*'
  - '@skuba-lib/*'
  - eslint-config-seek
  - eslint-config-skuba
  - eslint-plugin-skuba
  - skuba
  - skuba-dive
  - tsconfig-seek
packageManagerStrictVersion: true
publicHoistPattern:
  - '@eslint/*'
  - '@types*'
  - eslint
  - eslint-config-skuba
  - prettier
  - esbuild
  - jest
  - tsconfig-seek
  - typescript
  # end managed by skuba

packages:
  - 'apps/*'
injectWorkspacePackages: true

nodeOptions: '\${NODE_OPTIONS:- } --max-old-space-size=8192'
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - 'apps/*'
injectWorkspacePackages: true

nodeOptions: '\${NODE_OPTIONS:- } --max-old-space-size=8192'
`,
    });
  });

  it('should migrate minimumReleaseAgeExcludeOverload from package.json to pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
  something
# end managed by skuba
`,
      'package.json': `{
  "name": "test",
  "version": "1.0.0",
  "minimumReleaseAgeExcludeOverload": [
    "package-a",
    "package-b"
  ]
}
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*

minimumReleaseAgeExclude:
  - package-a
  - package-b
`,
      'package.json': `{
  "name": "test",
  "version": "1.0.0"
}
`,
    });
  });

  it('should upgrade packageManager version if less than 10.26.2', async () => {
    vol.fromJSON({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
  something
# end managed by skuba
`,
      'package.json': `{
  "name": "test",
  "version": "1.0.0",
  "packageManager": "pnpm@10.7.0+sha123456"
}
`,
    });

    await expect(
      migrateToPnpmConfig({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'src/utils/package.json': `{
      "devDependencies": {
        "pnpm-plugin-skuba": "1.0.0"
      }
    }`,
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
`,
      'package.json': `{
  "name": "test",
  "version": "1.0.0",
  "packageManager": "pnpm@10.26.2"
}
`,
    });
  });
});
