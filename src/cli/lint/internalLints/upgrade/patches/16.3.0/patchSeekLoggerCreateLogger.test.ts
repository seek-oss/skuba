import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../../../../testing/memfs.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import { patchSeekLoggerCreateLogger } from './patchSeekLoggerCreateLogger.js';

vi.mock('fs-extra', () => ({
  default: memfs,
  ...memfs,
}));

vi.mock('@skuba-lib/api/git', async () => ({
  ...(await vi.importActual<object>('@skuba-lib/api/git')),
  findRoot: vi.fn(),
}));
import * as Git from '@skuba-lib/api/git';

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
    vol.fromJSON(
      {
        'README.md': '',
      },
      process.cwd(),
    );

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
    vol.fromJSON(
      {
        'src/logger.ts': `import { createLogger } from '@seek/logger';

export const logger = createLogger();
`,
      },
      process.cwd(),
    );

    await expect(
      patchSeekLoggerCreateLogger({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no default imports from @seek/logger',
    } satisfies PatchReturnType);
  });

  it('should alias a default import that is not named createLogger', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import logger from '@seek/logger';

export const log = logger();
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/logger.ts": "import { createLogger as logger } from '@seek/logger';

      export const log = logger();
      ",
      }
    `);
  });

  it('should not modify files in lint mode', async () => {
    const contents = `import createLogger from '@seek/logger';

export const logger = createLogger();
`;

    vol.fromJSON(
      {
        'src/logger.ts': contents,
      },
      process.cwd(),
    );

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
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger from '@seek/logger';

export const logger = createLogger();
`,
      },
      process.cwd(),
    );

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
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger from "@seek/logger";
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger } from "@seek/logger";
`,
    );
  });

  it('should alias a default import when merging with existing named imports', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import logger, { type Foo } from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger as logger, type Foo } from '@seek/logger';
`,
    );
  });

  it('should merge a default import with existing named imports', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger, { type Foo } from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo } from '@seek/logger';
`,
    );
  });

  it('should merge a default import with multiple named imports', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger, { type Foo, bar } from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo, bar } from '@seek/logger';
`,
    );
  });

  it('should not duplicate createLogger if it is already a named import', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger, { createLogger, type Foo } from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, type Foo } from '@seek/logger';
`,
    );
  });

  it('should keep an aliased named createLogger and add a local binding', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger, { createLogger as log } from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger, createLogger as log } from '@seek/logger';
`,
    );
  });

  it('should alias import type default imports', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import type logger from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import type { createLogger as logger } from '@seek/logger';
`,
    );
  });

  it('should convert import type default imports', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import type createLogger from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import type { createLogger } from '@seek/logger';
`,
    );
  });

  it('should split an aliased default import from a namespace import', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import logger, * as seekLogger from '@seek/logger';
`,
      },
      process.cwd(),
    );

    await expect(patchSeekLoggerCreateLogger(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/logger.ts']).toBe(
      `import { createLogger as logger } from '@seek/logger';
import * as seekLogger from '@seek/logger';
`,
    );
  });

  it('should split a default import from a namespace import', async () => {
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger, * as logger from '@seek/logger';
`,
      },
      process.cwd(),
    );

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
    vol.fromJSON(
      {
        'src/logger.ts': `import createLogger from '@seek/logger';
`,
        'src/app.ts': `import createLogger, { type Logger } from '@seek/logger';
`,
      },
      process.cwd(),
    );

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
