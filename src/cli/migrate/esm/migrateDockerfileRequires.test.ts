import memfs, { vol } from 'memfs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../utils/packageManager.js';
import type {
  PatchConfig,
  PatchReturnType,
} from '../../lint/internalLints/upgrade/index.js';

import { migrateDockerfileRequires } from './migrateDockerfileRequires.js';

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
  packageManager: configForPackageManager('yarn'),
  mode: 'format',
};

describe('migrateDockerfileRequires', () => {
  it('should skip if no Dockerfile files are found', async () => {
    await expect(
      migrateDockerfileRequires({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no Dockerfile files found',
    } satisfies PatchReturnType);
  });

  it('should rename Dockerfile requires to Dockerfile imports', async () => {
    vol.fromJSON({
      Dockerfile:
        'CMD ["node", "--require", "lib/tracing.js", "--require", "other.js", "index.ts"]',
    });

    await expect(
      migrateDockerfileRequires({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    } satisfies PatchReturnType);

    expect(volToJson()).toMatchInlineSnapshot(`
      {
        "Dockerfile": "CMD ["node", "--import", "lib/tracing.js", "--import", "other.js", "index.ts"]",
      }
    `);
  });
});
