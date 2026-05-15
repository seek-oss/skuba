import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../../../../utils/logging.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  patchTsdownUnbundle,
  tryPatchTsdownUnbundle,
} from './patchTsdownUnbundle.js';

vi.mock('../../../../../../utils/exec.js', () => ({
  createExec: () => vi.fn(),
}));

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

vi.mock('../../../../../../utils/logging.js', () => ({
  log: {
    warn: vi.fn(),
    subtle: vi.fn(),
  },
}));

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
  packageManager: configForPackageManager('pnpm'),
  mode: 'format',
};

describe('patchTsdownUnbundle', () => {
  it('should skip if no tsdown configs are found', async () => {
    vol.fromJSON({
      'index.ts': '',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config files found',
    } satisfies PatchReturnType);
  });

  it('should skip if no unbundle field is found', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  failOnWarn: true,
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
  dts: true,
  publint: true,
  attw: true,
});
`,
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    } satisfies PatchReturnType);
  });

  it('should skip if unbundle is true but TODO comment is absent', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true,
  publint: true,
});
`,
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    } satisfies PatchReturnType);
  });

  it('should skip if .vocab files are present (potentially ships translations)', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`,
      'src/.vocab/translations.json': '{}',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'potentially ships translations',
    } satisfies PatchReturnType);
  });

  it('should skip if .css files are present (potentially ships css)', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`,
      'src/styles/button.css': '.button {}',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'potentially ships css',
    } satisfies PatchReturnType);
  });

  it('should remove unbundle from tsdown.config.mts', async () => {
    vol.fromJSON({
      'tsdown.config.mts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  deps: {
    onlyBundle: false,
  },
  failOnWarn: true,
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'lib',
  dts: true,
  checks: {
    legacyCjs: false,
  },
  publint: true,
  attw: true,
  unbundle: true, // TODO: determine if your project can be bundled
  // @smithy devDeps are intentionally inlined
  exports: { devExports: '@seek/indie-rita-ora/source' },
});
`,
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "tsdown.config.mts": "import { defineConfig } from 'tsdown';
      export default defineConfig({
        deps: {
          onlyBundle: false,
        },
        failOnWarn: true,
        entry: ['src/index.ts'],
        format: ['cjs', 'esm'],
        outDir: 'lib',
        dts: true,
        checks: {
          legacyCjs: false,
        },
        publint: true,
        attw: true,
        
        // @smithy devDeps are intentionally inlined
        exports: { devExports: '@seek/indie-rita-ora/source' },
      });
      ",
      }
    `);
  });

  it('should process multiple tsdown config files and patch all that qualify', async () => {
    vol.fromJSON({
      'packages/pkg-a/tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`,
      'packages/pkg-b/tsdown.config.mts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`,
      'packages/pkg-c/tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  publint: true,
});
`,
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    expect(result['packages/pkg-a/tsdown.config.ts']).not.toContain('unbundle');
    expect(result['packages/pkg-b/tsdown.config.mts']).not.toContain(
      'unbundle',
    );
    expect(result['packages/pkg-c/tsdown.config.ts']).toMatchInlineSnapshot(`
      "import { defineConfig } from 'tsdown';
      export default defineConfig({
        entry: ['src/index.ts'],
        publint: true,
      });
      "
    `);
  });

  it('should report lint result without modifying file', async () => {
    const originalContent = `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`;

    vol.fromJSON({
      'tsdown.config.ts': originalContent,
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toEqual({
      'tsdown.config.ts': originalContent,
    });
  });
  it('should patch a package that has unbundle even when another package has .vocab files', async () => {
    vol.fromJSON({
      'packages/pkg-a/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'packages/pkg-b/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'packages/pkg-b/src/.vocab/translations.json': '{}',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    // pkg-a has no .vocab files so should be patched
    expect(result['packages/pkg-a/tsdown.config.ts']).not.toContain('unbundle');

    // pkg-b ships translations so should be left untouched
    expect(result['packages/pkg-b/tsdown.config.ts']).toContain('unbundle');
  });

  it('should patch a package that has unbundle even when another package has .css files', async () => {
    vol.fromJSON({
      'packages/pkg-a/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'packages/pkg-b/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'packages/pkg-b/src/styles/button.css': '.button {}',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    const result = volToJson();

    // pkg-a has no .css files so should be patched
    expect(result['packages/pkg-a/tsdown.config.ts']).not.toContain('unbundle');

    // pkg-b ships css so should be left untouched
    expect(result['packages/pkg-b/tsdown.config.ts']).toContain('unbundle');
  });

  it('should skip with translations reason when all packages with unbundle ship translations', async () => {
    vol.fromJSON({
      'packages/pkg-a/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'packages/pkg-b/tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    publint: true,
  });
  `,
      'packages/pkg-a/src/.vocab/translations.json': '{}',
    });

    // pkg-a would be migrated but ships translations — skipped
    // pkg-b has no unbundle field — nothing to migrate
    // net result: nothing was patched
    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    } satisfies PatchReturnType);
  });

  it('should prefer translations skip reason over css skip reason', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
  export default defineConfig({
    entry: ['src/index.ts'],
    unbundle: true, // TODO: determine if your project can be bundled
    publint: true,
  });
  `,
      'src/.vocab/translations.json': '{}',
      'src/styles/button.css': '.button {}',
    });

    await expect(
      patchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'potentially ships translations',
    } satisfies PatchReturnType);
  });
});

describe('tryPatchTsdownUnbundle', () => {
  it('should return the result of patchTsdownUnbundle on success', async () => {
    vol.fromJSON({
      'tsdown.config.ts': `import { defineConfig } from 'tsdown';
export default defineConfig({
  entry: ['src/index.ts'],
  unbundle: true, // TODO: determine if your project can be bundled
  publint: true,
});
`,
    });

    await expect(
      tryPatchTsdownUnbundle({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
  });

  it('should return skip and log a warning if patchTsdownUnbundle throws', async () => {
    vol.fromJSON({
      'tsdown.config.ts': 'any content',
    });

    vi.spyOn(memfs.fs.promises, 'readFile').mockRejectedValueOnce(
      new Error('disk read failure'),
    );

    await expect(
      tryPatchTsdownUnbundle({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'due to an error',
    } satisfies PatchReturnType);

    expect(log.warn).toHaveBeenCalledWith(
      'Failed to apply tsdown unbundle patch.',
    );
    expect(log.subtle).toHaveBeenCalledOnce();
  });
});
