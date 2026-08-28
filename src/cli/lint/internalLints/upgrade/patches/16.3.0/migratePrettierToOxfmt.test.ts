import os from 'os';
import path from 'path';

import { mkdtemp, outputFile, pathExists, readFile, rm } from 'fs-extra';
import { defaults as seekOxfmtConfig } from 'oxc-config-seek/oxfmt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as execModule from '../../../../../../utils/exec.js';
import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import type { PatchConfig, PatchReturnType } from '../../index.js';

import {
  buildOxfmtConfigTs,
  migratePrettierToOxfmt,
} from './migratePrettierToOxfmt.js';

vi.mock('../../../../../../utils/exec.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../../../../../utils/exec.js')
  >('../../../../../../utils/exec.js');

  return {
    ...actual,
    exec: vi.fn(),
  };
});

vi.mock('../../../patchPnpmWorkspace.js', () => ({
  patchPnpmWorkspace: vi.fn(),
}));

const exec = vi.mocked(execModule.exec);
const patchPnpmWorkspaceMock = vi.mocked(patchPnpmWorkspace);

const typicalMigratedConfig = {
  ...seekOxfmtConfig,
  sortPackageJson: {},
};

const SEEK_PRETTIER_CONFIG = `{
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "plugins": ["prettier-plugin-packagejson"]
}
`;

const SEEK_PRETTIERIGNORE = `/.gantry/**/*.yaml
/.gantry/**/*.yml
gantry*.yaml
gantry*.yml
pnpm-lock.yaml
coverage
`;

const defaultOxfmtConfigTs = `import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
});
`;

const writeFiles = async (root: string, files: Record<string, string>) => {
  await Promise.all(
    Object.entries(files).map(([file, contents]) =>
      outputFile(path.join(root, file), contents),
    ),
  );
};

const baseArgs = (dir: string): PatchConfig => ({
  dir,
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
});

describe('buildOxfmtConfigTs', () => {
  it('returns the default config when migrated options match oxc-config-seek', () => {
    expect(buildOxfmtConfigTs(typicalMigratedConfig)).toBe(
      defaultOxfmtConfigTs,
    );
  });

  it('treats sortPackageJson true and {} as equivalent', () => {
    expect(
      buildOxfmtConfigTs({
        ...typicalMigratedConfig,
        sortPackageJson: true,
      }),
    ).toBe(defaultOxfmtConfigTs);
  });

  it('spreads extra ignorePatterns onto the seek defaults', () => {
    expect(
      buildOxfmtConfigTs({
        ...typicalMigratedConfig,
        ignorePatterns: [...seekOxfmtConfig.ignorePatterns, 'custom-ignore'],
      }),
    ).toBe(`import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    ...oxfmtConfig.ignorePatterns,
    'custom-ignore',
  ],
});
`);
  });

  it('adds scalar differences that are not in the seek config', () => {
    expect(
      buildOxfmtConfigTs({
        ...typicalMigratedConfig,
        printWidth: 100,
        semi: false,
      }),
    ).toBe(`import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  printWidth: 100,
  semi: false,
});
`);
  });

  it('overrides sortPackageJson when it is explicitly disabled', () => {
    expect(
      buildOxfmtConfigTs({
        ...typicalMigratedConfig,
        sortPackageJson: false,
      }),
    ).toBe(`import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  sortPackageJson: false,
});
`);
  });

  it('ignores empty ignorePatterns when the seek config already has patterns', () => {
    expect(
      buildOxfmtConfigTs({
        ...typicalMigratedConfig,
        ignorePatterns: [],
      }),
    ).toBe(defaultOxfmtConfigTs);
  });
});

describe('migratePrettierToOxfmt', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), 'skuba-oxfmt-migrate-'));
    vi.clearAllMocks();
    patchPnpmWorkspaceMock.mockResolvedValue({
      ok: true,
      fixable: false,
    });
    exec.mockResolvedValue(undefined as never);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('skips when no Prettier config files are found', async () => {
    await writeFiles(dir, {
      'package.json': '{ "name": "test" }\n',
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'format' }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Prettier config files found',
    } satisfies PatchReturnType);

    expect(patchPnpmWorkspaceMock).not.toHaveBeenCalled();
    await expect(pathExists(path.join(dir, 'oxfmt.config.ts'))).resolves.toBe(
      false,
    );
  });

  it('returns apply without writing in lint mode', async () => {
    await writeFiles(dir, {
      '.prettierrc': SEEK_PRETTIER_CONFIG,
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'lint' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(patchPnpmWorkspaceMock).not.toHaveBeenCalled();
    await expect(pathExists(path.join(dir, 'oxfmt.config.ts'))).resolves.toBe(
      false,
    );
    await expect(pathExists(path.join(dir, '.prettierrc'))).resolves.toBe(true);
  });

  it('hoists oxfmt, writes the default config, and deletes Prettier files', async () => {
    await writeFiles(dir, {
      '.prettierrc': SEEK_PRETTIER_CONFIG,
      '.prettierignore': SEEK_PRETTIERIGNORE,
      'package.json': '{ "name": "test" }\n',
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(patchPnpmWorkspaceMock).toHaveBeenCalledWith('format', dir);
    expect(exec).toHaveBeenCalledWith(
      'pnpm',
      'install',
      '--frozen-lockfile=false',
      '--prefer-offline',
    );

    await expect(
      readFile(path.join(dir, 'oxfmt.config.ts'), 'utf8'),
    ).resolves.toBe(defaultOxfmtConfigTs);
    await expect(pathExists(path.join(dir, '.prettierrc'))).resolves.toBe(
      false,
    );
    await expect(pathExists(path.join(dir, '.prettierignore'))).resolves.toBe(
      false,
    );
    await expect(pathExists(path.join(dir, '.oxfmtrc.json'))).resolves.toBe(
      false,
    );
    await expect(
      readFile(path.join(dir, 'package.json'), 'utf8'),
    ).resolves.toBe('{ "name": "test" }\n');
  });

  it('spreads extra ignore patterns from the migrated Prettier config', async () => {
    await writeFiles(dir, {
      '.prettierrc': SEEK_PRETTIER_CONFIG,
      '.prettierignore': `${SEEK_PRETTIERIGNORE}custom-ignore\n`,
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    await expect(
      readFile(path.join(dir, 'oxfmt.config.ts'), 'utf8'),
    ).resolves.toBe(
      `import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  ignorePatterns: [
    ...oxfmtConfig.ignorePatterns,
    'custom-ignore',
  ],
});
`,
    );
  });

  it('removes a Prettier key from package.json', async () => {
    await writeFiles(dir, {
      'package.json': `${JSON.stringify(
        {
          name: 'test',
          prettier: { singleQuote: true, tabWidth: 4 },
        },
        null,
        2,
      )}\n`,
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    await expect(
      readFile(path.join(dir, 'oxfmt.config.ts'), 'utf8'),
    ).resolves.toBe(
      `import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  tabWidth: 4,
  sortPackageJson: false,
});
`,
    );
    await expect(
      readFile(path.join(dir, 'package.json'), 'utf8'),
    ).resolves.toBe(
      `{
  "name": "test"
}
`,
    );
  });

  it('migrates nested Prettier configs in a monorepo', async () => {
    await writeFiles(dir, {
      '.prettierrc': SEEK_PRETTIER_CONFIG,
      '.prettierignore': SEEK_PRETTIERIGNORE,
      'packages/foo/.prettierrc': '{ "semi": false }\n',
    });

    await expect(
      migratePrettierToOxfmt({ ...baseArgs(dir), mode: 'format' }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    await expect(
      readFile(path.join(dir, 'oxfmt.config.ts'), 'utf8'),
    ).resolves.toBe(defaultOxfmtConfigTs);
    await expect(
      readFile(path.join(dir, 'packages/foo/oxfmt.config.ts'), 'utf8'),
    ).resolves.toBe(`import oxfmtConfig from 'oxc-config-seek/oxfmt';
import { defineConfig } from 'oxfmt';

export default defineConfig({
  ...oxfmtConfig,
  semi: false,
  sortPackageJson: false,
});
`);
    await expect(pathExists(path.join(dir, '.prettierrc'))).resolves.toBe(
      false,
    );
    await expect(
      pathExists(path.join(dir, 'packages/foo/.prettierrc')),
    ).resolves.toBe(false);
  });

  it('does not run pnpm install for yarn projects', async () => {
    await writeFiles(dir, {
      '.prettierrc': '{ "singleQuote": true }\n',
    });

    await expect(
      migratePrettierToOxfmt({
        ...baseArgs(dir),
        packageManager: configForPackageManager('yarn'),
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(exec).not.toHaveBeenCalled();
    await expect(pathExists(path.join(dir, 'oxfmt.config.ts'))).resolves.toBe(
      true,
    );
  });
});
