import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { migrateToPnpmFile } from './migrateToPnpmFile.js';

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

describe('migrateToPnpmFile', () => {
  it('should skip if no pnpm-workspace.yaml is found', async () => {
    vol.fromJSON({});

    await expect(
      migrateToPnpmFile({
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
      migrateToPnpmFile({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
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

  it('should remove a managed by skuba block and create `.pnpmfile.cjs`', async () => {
    vol.fromJSON({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found', async () => {
    vol.fromJSON({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:
  - orphan
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found after comments', async () => {
    vol.fromJSON({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:
  # some comment describing why
  - orphan
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
    });
  });

  it('should add publicHoistPattern if orphan dash items are found after empty paragraphs', async () => {
    vol.fromJSON({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
publicHoistPattern:

  - orphan
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
    });
  });

  it('should migrate minimumReleaseAgeExcludeOverload from package.json to pnpm-workspace.yaml', async () => {
    vol.fromJSON({
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
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*

minimumReleaseAgeExclude:
  - package-a
  - package-b
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
      'package.json': `{
  "name": "test",
  "version": "1.0.0"
}
`,
    });
  });

  it('should fix Dockerfiles to mount .pnpmfile.cjs', async () => {
    vol.fromJSON({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
# managed by skuba
  something
# end managed by skuba
`,
      Dockerfile: `
RUN --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \\
    pnpm install
`,
    });

    await expect(
      migrateToPnpmFile({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual<PatchReturnType>({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `
packages:
  - packages/*
  - template/*
`,
      '.pnpmfile.cjs': `module.exports = require("skuba/config/.pnpmfile.cjs");
`,
      Dockerfile: `
RUN --mount=type=bind,source=package.json,target=package.json \\
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \\
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \\
    --mount=type=bind,source=.pnpmfile.cjs,target=.pnpmfile.cjs \\
    pnpm install
`,
    });
  });
});
