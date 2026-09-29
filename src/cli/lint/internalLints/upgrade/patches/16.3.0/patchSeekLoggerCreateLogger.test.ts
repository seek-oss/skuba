import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.js';

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

describe('patchSeekLoggerCreateLogger', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if no source files are found', async () => {
    vol.fromJSON({
      'README.md': '',
    });

    await expect(
      patchSeekLoggerCreateLogger({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no source files found',
    } satisfies PatchReturnType);
  });

  it('should skip if createLogger is already a named import', async () => {
    vol.fromJSON({
      'src/logger.ts': `import { createLogger } from '@seek/logger';

export const logger = createLogger();
`,
    });

    await expect(
      patchSeekLoggerCreateLogger({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no default createLogger imports from @seek/logger',
    } satisfies PatchReturnType);
  });

  it('should skip default imports that are not createLogger', async () => {
    vol.fromJSON({
      'src/logger.ts': `import logger from '@seek/logger';
`,
    });

    await expect(
      patchSeekLoggerCreateLogger({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no default createLogger imports from @seek/logger',
    } satisfies PatchReturnType);
  });

  it('should not modify files in lint mode', async () => {
    const contents = `import createLogger from '@seek/logger';

export const logger = createLogger();
`;

    vol.fromJSON({
      'src/logger.ts': contents,
    });

    await expect(
      patchSeekLoggerCreateLogger({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toEqual(contents);
  });

  it('should convert a default createLogger import to a named import', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger from '@seek/logger';

export const logger = createLogger();
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/logger.ts": "import { createLogger } from '@seek/logger';

      export const logger = createLogger();
      ",
      }
    `);
  });

  it('should preserve double quotes', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger from "@seek/logger";
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger } from "@seek/logger";
`,
    );
  });

  it('should merge a default import with existing named imports', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger, { type Foo } from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo } from '@seek/logger';
`,
    );
  });

  it('should merge a default import with multiple named imports', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger, { type Foo, bar } from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo, bar } from '@seek/logger';
`,
    );
  });

  it('should not duplicate createLogger if it is already a named import', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger, { createLogger, type Foo } from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo } from '@seek/logger';
`,
    );
  });

  it('should keep an aliased named createLogger and add a local binding', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger, { createLogger as log } from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, createLogger as log } from '@seek/logger';
`,
    );
  });

  it('should convert import type default imports', async () => {
    vol.fromJSON({
      'src/logger.ts': `import type createLogger from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import type { createLogger } from '@seek/logger';
`,
    );
  });

  it('should split a default import from a namespace import', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger, * as logger from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger } from '@seek/logger';
import * as logger from '@seek/logger';
`,
    );
  });

  it('should update multiple files', async () => {
    vol.fromJSON({
      'src/logger.ts': `import createLogger from '@seek/logger';
`,
      'src/app.ts': `import createLogger, { type Logger } from '@seek/logger';
`,
    });

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/app.ts": "import { createLogger, type Logger } from '@seek/logger';
      ",
        "src/logger.ts": "import { createLogger } from '@seek/logger';
      ",
      }
    `);
  });
});
