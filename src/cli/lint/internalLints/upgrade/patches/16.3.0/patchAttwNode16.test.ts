import path from 'path';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchAttwNode16 } from './patchAttwNode16.js';

import * as Git from '@skuba-lib/api/git';

vi.mock('fs-extra', () => ({
  default: memfs.fs,
  ...memfs.fs,
}));
vi.mock('fast-glob', () => ({
  default: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
}));

const findRoot = vi.mocked(Git.findRoot);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

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

describe('patchAttwNode16', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if no tsdown configs are found', async () => {
    vol.fromJSON({
      'index.ts': '',
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config files found',
    } satisfies PatchReturnType);
  });

  it('should skip if attw is already configured with a profile', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  attw: {
    profile: 'node16',
  },
  publint: true,
});
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no attw: true configs to update',
    } satisfies PatchReturnType);
  });

  it('should skip if attw is not true', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  attw: false,
  publint: true,
});
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no attw: true configs to update',
    } satisfies PatchReturnType);
  });

  it('should not modify files in lint mode', async () => {
    const contents = `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  attw: true,
  publint: true,
});
`;

    vol.fromJSON({
      'tsdown.config.ts': contents,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['tsdown.config.ts']).toEqual(contents);
  });

  it('should update attw: true in tsdown.config.ts', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  entry: 'src/index.ts',
  attw: true,
  publint: true,
});
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.ts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig({
        entry: 'src/index.ts',
        attw: {
          profile: 'node16',
        },
        publint: true,
      });
      ",
      }
    `);
  });

  it('should update attw: true in tsdown.config.mts', async () => {
    vol.fromJSON({
      'tsdown.config.mts': `import { defineConfig } from 'tsdown/config';

export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts'],
  publint: true,
  attw: true,
});
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.mts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig({
        failOnWarn: true,
        entry: ['src/index.ts'],
        publint: true,
        attw: {
          profile: 'node16',
        },
      });
      ",
      }
    `);
  });

  it('should update every attw: true in a defineConfig array', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown/config';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    attw: true,
  },
  {
    entry: ['src/cli.ts'],
    attw: true,
  },
]);
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.ts": "import { defineConfig } from 'tsdown/config';

      export default defineConfig([
        {
          entry: ['src/index.ts'],
          attw: {
            profile: 'node16',
          },
        },
        {
          entry: ['src/cli.ts'],
          attw: {
            profile: 'node16',
          },
        },
      ]);
      ",
      }
    `);
  });

  it('should update multiple tsdown configs', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `export default {
  attw: true,
};
`,
      'packages/api/tsdown.config.mts': `export default {
  attw: true,
  publint: true,
};
`,
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "packages/api/tsdown.config.mts": "export default {
        attw: {
          profile: 'node16',
        },
        publint: true,
      };
      ",
        "tsdown.config.ts": "export default {
        attw: {
          profile: 'node16',
        },
      };
      ",
      }
    `);
  });

  it('should search from the git root even if dir is a subdirectory', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `export default {
  attw: true,
};
`,
      'packages/api/package.json': '{}',
    });

    await expect(
      patchAttwNode16({
        ...baseArgs,
        dir: path.join(process.cwd(), 'packages/api'),
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['tsdown.config.ts']).toMatchInlineSnapshot(`
      "export default {
        attw: {
          profile: 'node16',
        },
      };
      "
    `);
  });
});
