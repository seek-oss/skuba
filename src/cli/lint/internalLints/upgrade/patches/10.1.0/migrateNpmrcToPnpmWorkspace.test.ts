import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryMigrateNpmrcToPnpmWorkspace } from './migrateNpmrcToPnpmWorkspace.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));
vi.mock('fast-glob', async () => ({
  glob: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

beforeEach(() => vol.reset());

const baseArgs = {
  manifest: {} as PatchConfig['manifest'],
  packageManager: configForPackageManager('pnpm'),
};

afterEach(() => vi.resetAllMocks());

const basicTests = (mode: 'lint' | 'format') => {
  it('should skip if not using pnpm', async () => {
    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode,
        packageManager: configForPackageManager('yarn'),
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'not using pnpm',
    });

    expect(volToJson()).toEqual({});
  });

  it('should skip if npmrc not found', async () => {
    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode,
      }),
    ).resolves.toEqual({
      result: 'skip',
      reason: 'no .npmrc found',
    });

    expect(volToJson()).toEqual({});
  });
};

describe('lint', () => {
  basicTests('lint');

  it('should mark as apply if npmrc exists', async () => {
    vol.fromJSON({
      '.npmrc': '',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'lint',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      '.npmrc': '',
    });
  });
});

describe('format', () => {
  basicTests('format');

  it('should perform a skuba-only migration', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n\n\n\n\n\n\n# some comment\n\n\n\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({});
  });

  it('should migrate custom settings', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\nsome-setting=12345\n#ignore me\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# some-setting=12345

`,
    });
  });

  it('should skip migrating a secret', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n_auth=12345\n#ignore me\nother-setting=12345\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# other-setting=12345

`,
    });
  });

  it('should prepend extra settings to the top of an existing pnpm-workspace.yaml', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\nsome-setting=12345\n#ignore me\n',
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': `# TODO: Translate these settings to the required format for pnpm-workspace.yaml.
# skuba moved these from .npmrc, but doesn't know what they mean.
# See: https://pnpm.io/settings
#
# some-setting=12345

packages:
  - "packages/*"
`,
    });
  });

  it('should leave pnpm-workspace.yaml alone if there are no settings to migrate', async () => {
    vol.fromJSON({
      '.npmrc':
        '# managed by skuba\nstuff\n# end managed by skuba\n#ignore me\n',
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n',
    });
  });

  it('should fix Dockerfiles & Buildkite pipelines', async () => {
    vol.fromJSON({
      '.npmrc': '# managed by skuba\nstuff\n# end managed by skuba',
      Dockerfile: `
RUN --mount=type=bind,source=.npmrc,target=.npmrc,required=true pnpm fetch
RUN --mount=type=bind,source=.npmrc,target=.npmrc pnpm install --prefer-offline --no-audit --progress=false
`.trim(),
      'nested/Dockerfile.different': `
RUN --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch

RUN --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch
`.trim(),
      '.buildkite/pipeline.yml': `
configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        secrets: id=npm,src=/tmp/.npmrc
    - something_else:
        - .npmrc
        - package.json#.packageManager
        - pnpm-lock.yaml
  `,
      'nested/.buildkite/whatever.yaml': `
configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
        cache-on:
          # oops a comment

          - package.json#.packageManager
          - .npmrc
          - pnpm-lock.yaml

        dockerfile: Dockerfile.dev-deps
        secrets: id=npm,src=/tmp/.npmrc

  `,
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      Dockerfile: `
RUN --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml,required=true pnpm fetch
RUN --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml pnpm install --prefer-offline --no-audit --progress=false
`.trim(),
      'nested/Dockerfile.different': `
RUN --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch

RUN --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch
`.trim(),
      '.buildkite/pipeline.yml': `
configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
        cache-on:
          - pnpm-workspace.yaml
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        secrets: id=npm,src=/tmp/.npmrc
    - something_else:
        - .npmrc
        - package.json#.packageManager
        - pnpm-lock.yaml
  `,
      'nested/.buildkite/whatever.yaml': `
configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.1: &docker-ecr-cache-defaults
        cache-on:
          # oops a comment

          - package.json#.packageManager
          - pnpm-workspace.yaml
          - pnpm-lock.yaml

        dockerfile: Dockerfile.dev-deps
        secrets: id=npm,src=/tmp/.npmrc

  `,
    });
  });

  it('should patch package.json files if pnpm@<10', async () => {
    vol.fromJSON({
      '.npmrc': '# managed by skuba\nstuff\n# end managed by skuba',
      'package.json': JSON.stringify({
        other: 'stuff',
        packageManager: 'pnpm@9.9.9',
        more: 'stuff',
      }),
      'nested1/package.json': JSON.stringify({
        packageManager: 'pnpm@10.1.1',
      }),
      'nested2/package.json': JSON.stringify(
        {
          packageManager: 'pnpm@9.ignoreme',
        },
        null,
        2,
      ),
      'nested3/package.json': JSON.stringify({}),
      'nested4/package.json': JSON.stringify({
        packageManager: 'pnpm@wot',
      }),
      'nested5/package.json': JSON.stringify({
        packageManager: 'yarn',
      }),
      'nested6/package.json': JSON.stringify({
        packageManager: 'pnpm@11.0.0',
      }),
    });

    await expect(
      tryMigrateNpmrcToPnpmWorkspace({
        ...baseArgs,
        mode: 'format',
      }),
    ).resolves.toEqual({
      result: 'apply',
    });

    expect(volToJson()).toEqual({
      'package.json': JSON.stringify({
        other: 'stuff',
        packageManager: 'pnpm@10.8.1',
        more: 'stuff',
      }),
      'nested1/package.json': JSON.stringify({
        packageManager: 'pnpm@10.1.1',
      }),
      'nested2/package.json': JSON.stringify(
        {
          packageManager: 'pnpm@10.8.1',
        },
        null,
        2,
      ),
      'nested3/package.json': JSON.stringify({}),
      'nested4/package.json': JSON.stringify({
        packageManager: 'pnpm@wot',
      }),
      'nested5/package.json': JSON.stringify({
        packageManager: 'yarn',
      }),
      'nested6/package.json': JSON.stringify({
        packageManager: 'pnpm@11.0.0',
      }),
    });
  });
});
