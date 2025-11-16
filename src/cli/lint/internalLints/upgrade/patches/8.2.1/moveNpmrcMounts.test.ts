// eslint-disable-next-line no-restricted-imports -- fs-extra is mocked
import fsp from 'fs/promises';

import memfs, { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryMoveNpmrcMounts } from './moveNpmrcMounts.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));
vi.mock('fast-glob', () => ({
  glob: async (pat: any, opts: any) => {
    const actualFastGlob =
      await vi.importActual<typeof import('fast-glob')>('fast-glob');
    return actualFastGlob.glob(pat, { ...opts, fs: memfs });
  },
}));

beforeEach(() => vol.reset());

describe('moveNpmrcMounts', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => vi.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should not need to modify any of the template pipelines', async () => {
      for (const template of await fsp.readdir('template')) {
        const pipelineFile = `template/${template}/.buildkite/pipeline.yml`;
        try {
          await fsp.stat(pipelineFile);
        } catch {
          continue;
        }

        const contents = await fsp.readFile(pipelineFile, 'utf-8');

        vol.fromJSON({
          '.buildkite/pipeline.yml': contents,
        });

        await expect(
          tryMoveNpmrcMounts({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no .npmrc mounts found need to be updated',
        });

        expect(volToJson()).toEqual({
          '.buildkite/pipeline.yml': contents,
        });
      }
    });

    it('should skip if no Buildkite files are found', async () => {
      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Buildkite files found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should skip on a pipeline without mounts', async () => {
      const input = `steps:
  - label: 'My Step'
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .npmrc mounts found need to be updated',
      });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should fix an incorrect mount', async () => {
      const input = `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=tmp/.npmrc

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
        output-path: tmp/

steps: []`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({ result: 'apply' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml':
          mode === 'lint'
            ? input
            : `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=/tmp/.npmrc

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
        output-path: /tmp/

steps: []`,
      });
    });

    it('should fix an incorrect mount with comments', async () => {
      const input = `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=tmp/.npmrc     # hello

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
        output-path: tmp/#world

steps: []`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({ result: 'apply' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml':
          mode === 'lint'
            ? input
            : `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=/tmp/.npmrc     # hello

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
        output-path: /tmp/#world

steps: []`,
      });
    });

    it('should skip a mount without tmp', async () => {
      const input = `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=.npmrc

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN

steps: []`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .npmrc mounts found need to be updated',
      });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should skip a /tmp/ mount', async () => {
      const input = `configs:
  plugins:
    - &docker-ecr-cache
      seek-oss/docker-ecr-cache#v2.2.0:
        cache-on:
          - .npmrc
          - package.json#.packageManager
          - pnpm-lock.yaml
        dockerfile: Dockerfile.dev-deps
        ecr-name: build-cache/my-service
        secrets: id=npm,src=/tmp/.npmrc

    - &private-npm
      seek-oss/private-npm#v1.2.0:
        env: NPM_READ_TOKEN
        output-path: /tmp/

steps: []`;

      vol.fromJSON({
        'packages/stuff/.buildkite/pipeline.yaml': input,
      });

      await expect(
        tryMoveNpmrcMounts({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no .npmrc mounts found need to be updated',
      });

      expect(volToJson()).toEqual({
        'packages/stuff/.buildkite/pipeline.yaml': input,
      });
    });
  });
});
