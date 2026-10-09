import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import memfs, { vol } from '../../../../../../testing/memfs.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  migrateSubpathImportExtensions,
  resolveImportKey,
} from './migrateSubpathImportExtensions.js';

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
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

const srcImports = {
  '#src/*': {
    '@seek/my-repo/source': './src/*',
    default: './lib/*',
  },
};

const packageJson = (imports: Record<string, unknown> = srcImports) =>
  JSON.stringify({ name: 'my-repo', type: 'module', imports }, null, 2);

describe('resolveImportKey', () => {
  it('prefers exact keys', () => {
    expect(resolveImportKey('#config', ['#*', '#config'])).toBe('#config');
  });

  it('prefers the longest matching base', () => {
    expect(
      resolveImportKey('#src/generated/a.js', ['#src/*', '#src/generated/*']),
    ).toBe('#src/generated/*');
  });

  it('prefers a key with a matching trailer when bases are equal', () => {
    expect(resolveImportKey('#src/a.json', ['#src/*', '#src/*.json'])).toBe(
      '#src/*.json',
    );
  });

  it('returns undefined when no key matches', () => {
    expect(resolveImportKey('#other/a.js', ['#src/*'])).toBeUndefined();
  });
});

describe('migrateSubpathImportExtensions', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vol.reset();
  });

  beforeEach(async () => {
    await vol.promises.mkdir(process.cwd(), { recursive: true });
    findRoot.mockResolvedValue(process.cwd());
  });

  it('should skip if there are no subpath imports in package.json', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'my-repo' }),
        'src/index.ts': `import { a } from './a.js';\n`,
      },
      process.cwd(),
    );

    await expect(
      migrateSubpathImportExtensions({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no extensionless subpath imports found in package.json',
    } satisfies PatchReturnType);
  });

  it('should skip if the subpath imports are already migrated', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson({
          '#src/*': {
            '@seek/my-repo/source': './src/*.ts',
            default: './lib/*.js',
          },
        }),
        'src/index.ts': `import { a } from '#src/a';\n`,
      },
      process.cwd(),
    );

    await expect(
      migrateSubpathImportExtensions({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no extensionless subpath imports found in package.json',
    } satisfies PatchReturnType);
  });

  it('should not modify files in lint mode', async () => {
    const files = {
      'package.json': packageJson(),
      'src/index.ts': `import { a } from '#src/a.js';\n`,
    };

    vol.fromJSON(files, process.cwd());

    await expect(
      migrateSubpathImportExtensions({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({ result: 'apply' } satisfies PatchReturnType);

    expect(volToJson()).toEqual(files);
  });

  it('should strip .js from subpath imports and update package.json', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson(),
        'src/index.ts': `import { a } from '#src/a.js';
import type { B } from '#src/b.js';
import '#src/register.js';
export { c } from '#src/c.js';
export * from '#src/d.js';
import { e } from './e.js';
import { f } from 'f/f.js';

const g = await import('#src/g.js');
type H = typeof import('#src/h.js');
const notAnImport = '#src/i.js';
`,
        'src/index.test.ts': `import { vi } from 'vitest';

vi.mock('#src/a.js', async () => ({
  ...(await vi.importActual('#src/a.js')),
}));
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          }
        }
      }
      ",
        "src/index.test.ts": "import { vi } from 'vitest';

      vi.mock('#src/a', async () => ({
        ...(await vi.importActual('#src/a')),
      }));
      ",
        "src/index.ts": "import { a } from '#src/a';
      import type { B } from '#src/b';
      import '#src/register';
      export { c } from '#src/c';
      export * from '#src/d';
      import { e } from './e.js';
      import { f } from 'f/f.js';

      const g = await import('#src/g');
      type H = typeof import('#src/h');
      const notAnImport = '#src/i.js';
      ",
      }
    `);
  });

  it('should keep other extensions and add subpath imports for them', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson(),
        'src/index.ts': `import data from '#src/data.json' with { type: 'json' };
import styles from '#src/styles.css';
import { a } from '#src/a.js';
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#src/*.css": {
            "@seek/my-repo/source": "./src/*.css",
            "default": "./lib/*.css"
          },
          "#src/*.json": {
            "@seek/my-repo/source": "./src/*.json",
            "default": "./lib/*.json"
          },
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          }
        }
      }
      ",
        "src/index.ts": "import data from '#src/data.json' with { type: 'json' };
      import styles from '#src/styles.css';
      import { a } from '#src/a';
      ",
      }
    `);
  });

  it('should strip .ts and leave other TypeScript extensions alone', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson(),
        'src/index.ts': `import { a } from '#src/a.ts';
import { b } from '#src/b.mts';
import { c } from '#src/c.tsx';
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          }
        }
      }
      ",
        "src/index.ts": "import { a } from '#src/a';
      import { b } from '#src/b.mts';
      import { c } from '#src/c.tsx';
      ",
      }
    `);
  });

  it('should migrate other subpath prefixes', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson({
          '#/*': {
            '@seek/my-repo/source': './src/*',
            default: './lib/*',
          },
          '#other/*': {
            '@seek/my-repo/source': './other/*',
            default: './lib-other/*',
          },
          '#lib/utils/*': {
            '@seek/my-repo/source': './utils/*',
            default: './lib/utils/*',
          },
        }),
        'src/index.ts': `import { a } from '#/a.js';
import data from '#/data.json' with { type: 'json' };
import { b } from '#other/b.js';
import { c } from '#lib/utils/c.js';
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#/*.json": {
            "@seek/my-repo/source": "./src/*.json",
            "default": "./lib/*.json"
          },
          "#/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          },
          "#other/*": {
            "@seek/my-repo/source": "./other/*.ts",
            "default": "./lib-other/*.js"
          },
          "#lib/utils/*": {
            "@seek/my-repo/source": "./utils/*.ts",
            "default": "./lib/utils/*.js"
          }
        }
      }
      ",
        "src/index.ts": "import { a } from '#/a';
      import data from '#/data.json' with { type: 'json' };
      import { b } from '#other/b';
      import { c } from '#lib/utils/c';
      ",
      }
    `);
  });

  it('should resolve specifiers to the most specific key', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson({
          '#config': './config.js',
          '#src/*.json': './src/*.json',
          '#src/*': {
            '@seek/my-repo/source': './src/*',
            default: './lib/*',
          },
          '#src/generated/*': {
            '@seek/my-repo/source': './generated/*',
            default: './lib/generated/*',
          },
        }),
        'src/index.ts': `import config from '#config';
import data from '#src/data.json' with { type: 'json' };
import { a } from '#src/a.js';
import { b } from '#src/generated/b.js';
import schema from '#src/generated/schema.graphql';
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#config": "./config.js",
          "#src/*.json": "./src/*.json",
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          },
          "#src/generated/*.graphql": {
            "@seek/my-repo/source": "./generated/*.graphql",
            "default": "./lib/generated/*.graphql"
          },
          "#src/generated/*": {
            "@seek/my-repo/source": "./generated/*.ts",
            "default": "./lib/generated/*.js"
          }
        }
      }
      ",
        "src/index.ts": "import config from '#config';
      import data from '#src/data.json' with { type: 'json' };
      import { a } from '#src/a';
      import { b } from '#src/generated/b';
      import schema from '#src/generated/schema.graphql';
      ",
      }
    `);
  });

  it('should update each package.json based on the files it owns', async () => {
    vol.fromJSON(
      {
        'package.json': JSON.stringify({ name: 'root', private: true }),
        'apps/a/package.json': packageJson(),
        'apps/a/src/index.ts': `import data from '#src/data.json' with { type: 'json' };
import { a } from '#src/a.js';
`,
        'apps/b/package.json': packageJson(),
        'apps/b/src/index.ts': `import { b } from '#src/b.js';\n`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "apps/a/package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#src/*.json": {
            "@seek/my-repo/source": "./src/*.json",
            "default": "./lib/*.json"
          },
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          }
        }
      }
      ",
        "apps/a/src/index.ts": "import data from '#src/data.json' with { type: 'json' };
      import { a } from '#src/a';
      ",
        "apps/b/package.json": "{
        "name": "my-repo",
        "type": "module",
        "imports": {
          "#src/*": {
            "@seek/my-repo/source": "./src/*.ts",
            "default": "./lib/*.js"
          }
        }
      }
      ",
        "apps/b/src/index.ts": "import { b } from '#src/b';
      ",
        "package.json": "{"name":"root","private":true}",
      }
    `);
  });

  it('should map targets based on their conditions', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson({
          '#src/*': {
            node: {
              '@seek/my-repo/source': './src/*',
              import: './lib/*',
              require: './lib-cjs/*',
            },
            default: './lib/*',
          },
          '#scripts/*': './scripts/*',
          '#dist/*': './dist/*',
        }),
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(JSON.parse(volToJson()['package.json'] ?? '')).toEqual({
      name: 'my-repo',
      type: 'module',
      imports: {
        '#src/*': {
          node: {
            '@seek/my-repo/source': './src/*.ts',
            import: './lib/*.js',
            require: './lib-cjs/*.js',
          },
          default: './lib/*.js',
        },
        '#scripts/*': './scripts/*.js',
        '#dist/*': './dist/*.js',
      },
    });
  });

  it('should strip .js from vi.mock and vi.importActual calls', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson(),
        'src/index.test.ts': `import { vi } from 'vitest';

import * as a from '#src/a.js';

vi.mock('#src/a.js');

vi.mock('#src/b.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('#src/b.js')>()),
  b: vi.fn(),
}));

vi.mock(import('#src/c.js'), async (importOriginal) => ({
  ...(await importOriginal()),
}));

vi.mock(\`#src/d.js\`, () => ({ d: vi.fn() }));

vi.doMock('#src/e.js');
vi.unmock('#src/f.js');
vi.doUnmock('#src/g.js');

const h = await vi.importActual<typeof import('#src/h.js')>('#src/h.js');
const i = await vi.importMock<typeof import('#src/i.js')>('#src/i.js');

vi.mock('#src/data.json', () => ({ default: {} }));
`,
      },
      process.cwd(),
    );

    await expect(migrateSubpathImportExtensions(baseArgs)).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()['src/index.test.ts']).toMatchInlineSnapshot(`
      "import { vi } from 'vitest';

      import * as a from '#src/a';

      vi.mock('#src/a');

      vi.mock('#src/b', async (importOriginal) => ({
        ...(await importOriginal<typeof import('#src/b')>()),
        b: vi.fn(),
      }));

      vi.mock(import('#src/c'), async (importOriginal) => ({
        ...(await importOriginal()),
      }));

      vi.mock(\`#src/d\`, () => ({ d: vi.fn() }));

      vi.doMock('#src/e');
      vi.unmock('#src/f');
      vi.doUnmock('#src/g');

      const h = await vi.importActual<typeof import('#src/h')>('#src/h');
      const i = await vi.importMock<typeof import('#src/i')>('#src/i');

      vi.mock('#src/data.json', () => ({ default: {} }));
      "
    `);

    expect(
      JSON.parse(volToJson()['package.json'] ?? '').imports,
    ).toHaveProperty('#src/*.json');
  });

  it('should be idempotent', async () => {
    vol.fromJSON(
      {
        'package.json': packageJson(),
        'src/index.ts': `import data from '#src/data.json' with { type: 'json' };
import { a } from '#src/a.js';
`,
      },
      process.cwd(),
    );

    await migrateSubpathImportExtensions(baseArgs);

    await expect(
      migrateSubpathImportExtensions({ ...baseArgs, mode: 'lint' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no extensionless subpath imports found in package.json',
    } satisfies PatchReturnType);
  });
});
