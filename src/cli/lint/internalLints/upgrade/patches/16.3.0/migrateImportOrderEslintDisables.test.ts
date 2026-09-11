import memfs, { vol } from 'memfs';
import seekOxfmtConfig from 'oxc-config-seek/oxfmt';
import { format } from 'oxfmt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  migrateImportOrderEslintDisables,
  rewriteFileImportOrderEslintDisables,
  rewriteImportOrderDisableComment,
} from './migrateImportOrderEslintDisables.js';

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
import * as Git from '@skuba-lib/api/git';

const findRoot = vi.mocked(Git.findRoot);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const baseArgs = { mode: 'format' } as PatchConfig;

describe('rewriteImportOrderDisableComment', () => {
  it.each([
    {
      name: 'next-line import-x/order',
      input: '// eslint-disable-next-line import-x/order',
      output: '// oxfmt-ignore',
    },
    {
      name: 'next-line import-x/order with a reason',
      input:
        '// eslint-disable-next-line import-x/order -- Mock import must be at top for jest.mock() hoisting',
      output: `// Mock import must be at top for jest.mock() hoisting
// oxfmt-ignore`,
    },
    {
      name: 'next-line legacy import/order',
      input: '// eslint-disable-next-line import/order',
      output: '// oxfmt-ignore',
    },
    {
      name: 'next-line mixed rules with a reason',
      input:
        '// eslint-disable-next-line import-x/order, no-console -- Mock import must be at top for jest.mock() hoisting',
      output: `// oxfmt-ignore
// eslint-disable-next-line no-console -- Mock import must be at top for jest.mock() hoisting`,
    },
    {
      name: 'next-line mixed rules with import-order last',
      input: '// eslint-disable-next-line no-console, import-x/order',
      output: `// oxfmt-ignore
// eslint-disable-next-line no-console`,
    },
    {
      name: 'block next-line import-x/order',
      input: '/* eslint-disable-next-line import-x/order */',
      output: '/* oxfmt-ignore */',
    },
    {
      name: 'block next-line import-x/order with a reason',
      input:
        '/* eslint-disable-next-line import-x/order -- keep this import */',
      output: `/* keep this import */
/* oxfmt-ignore */`,
    },
    {
      name: 'disable-line import-x/order',
      input: '// eslint-disable-line import-x/order',
      output: '// oxfmt-ignore',
    },
    {
      name: 'disable-line import-x/order with a reason',
      input: '// eslint-disable-line import-x/order -- keep this import',
      output: '// oxfmt-ignore',
    },
    {
      name: 'mixed disable-line',
      input:
        '// eslint-disable-line import-x/order, no-console -- keep this import',
      output:
        '/* oxfmt-ignore */ // eslint-disable-line no-console -- keep this import',
    },
    {
      name: 'block disable-line',
      input: '/* eslint-disable-line import-x/order */',
      output: '/* oxfmt-ignore */',
    },
    {
      name: 'file-level disable of only import-x/order',
      input: '/* eslint-disable import-x/order */',
      output: '',
    },
    {
      name: 'file-level disable of mixed rules',
      input: '/* eslint-disable import-x/order, no-console -- keep */',
      output: '/* eslint-disable no-console -- keep */',
    },
    {
      name: 'file-level enable of only import-x/order',
      input: '/* eslint-enable import-x/order */',
      output: '',
    },
    {
      name: 'file-level enable of mixed rules',
      input: '/* eslint-enable no-console, import/order */',
      output: '/* eslint-enable no-console */',
    },
  ])('rewrites $name', ({ input, output }) => {
    expect(rewriteImportOrderDisableComment(input)).toBe(output);
  });

  it.each([
    '// eslint-disable-next-line no-console',
    '// eslint-disable-next-line import-x/no-duplicates',
    '// just a comment about import-x/order',
    '/* oxfmt-ignore */',
    '// eslint-disable-next-line',
  ])('leaves %s unchanged', (input) => {
    expect(rewriteImportOrderDisableComment(input)).toBeNull();
  });
});

describe('rewriteFileImportOrderEslintDisables', () => {
  it('rewrites a next-line disable, leaving indentation to Oxfmt', async () => {
    const contents = `export const value = {
  // eslint-disable-next-line import-x/order -- Mock import must be at top for jest.mock() hoisting
  a: 1,
};
`;

    const rewritten = await rewriteFileImportOrderEslintDisables(contents);

    expect(rewritten).toBe(`export const value = {
  // Mock import must be at top for jest.mock() hoisting
// oxfmt-ignore
  a: 1,
};
`);

    const { code } = await format('a.ts', rewritten, seekOxfmtConfig);

    expect(code).toBe(`export const value = {
  // Mock import must be at top for jest.mock() hoisting
  // oxfmt-ignore
  a: 1,
};
`);
  });

  it('does not rewrite import-x/order mentions inside template literals', async () => {
    const contents = `const snippet = \`
// eslint-disable-next-line import-x/order -- don't move
import { mockLogger } from './mockLogger.js';
\`;
`;

    await expect(rewriteFileImportOrderEslintDisables(contents)).resolves.toBe(
      contents,
    );
  });

  it('deletes a file-level import-x/order disable', async () => {
    const contents = `/* eslint-disable import-x/order */

import fs from 'fs';
import { z } from 'zod';
`;

    await expect(rewriteFileImportOrderEslintDisables(contents)).resolves.toBe(`

import fs from 'fs';
import { z } from 'zod';
`);
  });
});

describe('oxfmt-ignore preserves import order', () => {
  it('leaves an oxfmt-ignored builtin import after an external import', async () => {
    const source = `import { z } from 'zod';
// oxfmt-ignore
import fs from 'fs';
`;

    const { code } = await format('a.ts', source, seekOxfmtConfig);

    expect(code).toBe(source);
  });

  it('sorts a builtin import before an external import without oxfmt-ignore', async () => {
    const source = `import { z } from 'zod';
import fs from 'fs';
`;

    const { code } = await format('a.ts', source, seekOxfmtConfig);

    expect(code).toBe(`import fs from 'fs';

import { z } from 'zod';
`);
  });
});

describe('migrateImportOrderEslintDisables', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('skips when no JavaScript or TypeScript files are found', async () => {
    vol.fromJSON({
      'README.md': '# hi\n',
    });

    await expect(migrateImportOrderEslintDisables(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no JavaScript or TypeScript files found',
    } satisfies PatchReturnType);
  });

  it('skips when files do not contain import-order ESLint disables', async () => {
    const input = {
      'src/index.ts': `import fs from 'fs';
`,
    };
    vol.fromJSON(input);

    await expect(migrateImportOrderEslintDisables(baseArgs)).resolves.toEqual({
      result: 'skip',
      reason: 'no import-x/order ESLint disables to replace',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('does not write in lint mode', async () => {
    const input = {
      'src/index.ts': `import { z } from 'zod';
// eslint-disable-next-line import-x/order
import fs from 'fs';
`,
    };
    vol.fromJSON(input);

    await expect(
      migrateImportOrderEslintDisables({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toEqual(input);
  });

  it('replaces import-x/order disables with oxfmt-ignore comments', async () => {
    vol.fromJSON({
      'src/index.ts': `import { z } from 'zod';
// eslint-disable-next-line import-x/order -- Mock import must be at top for jest.mock() hoisting
import fs from 'fs';
`,
      'src/other.ts': `import { z } from 'zod';
import fs from 'fs'; // eslint-disable-line import/order
`,
    });

    await expect(migrateImportOrderEslintDisables(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);
    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "src/index.ts": "import { z } from 'zod';
      // Mock import must be at top for jest.mock() hoisting
      // oxfmt-ignore
      import fs from 'fs';
      ",
        "src/other.ts": "import { z } from 'zod';
      import fs from 'fs'; // oxfmt-ignore
      ",
      }
    `);
  });
});
