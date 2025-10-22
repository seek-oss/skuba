import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// eslint-disable-next-line no-restricted-imports -- fs-extra is mocked
import fsp from 'fs/promises';

import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

vi.mock('fs', () => memfs);
vi.mock('fast-glob', async () => ({
  glob: async (pat: any, opts: any) =>
    await vi.importActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

describe('collapseDuplicateMergeKeys', () => {
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
          tryCollapseDuplicateMergeKeys({
            ...baseArgs,
            mode,
          }),
        ).resolves.toEqual({
          result: 'skip',
          reason: 'no duplicate merge keys found',
        });

        expect(volToJson()).toEqual({
          '.buildkite/pipeline.yml': contents,
        });
      }
    });

    it('should skip if no Buildkite files are found', async () => {
      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Buildkite files found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should skip if no duplicate merge keys are found', async () => {
      const input = `
configs:
  environments:
    - &prod
      agents:
        queue: my-prod-queue

steps:
  - label: 'My Step'
    <<: *prod
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no duplicate merge keys found',
      });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should process 2 duplicate merge keys', async () => {
      const input = `
configs:
  environments:
    - &prod
      agents:
        queue: my-prod-queue
  base-steps:
    - &timeout
      timeout_in_minutes: 10

steps:
- label: 'My Step'
  <<: *prod
  <<: *timeout
  command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({ result: 'apply' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml':
          mode === 'lint'
            ? input
            : `
configs:
  environments:
    - &prod
      agents:
        queue: my-prod-queue
  base-steps:
    - &timeout
      timeout_in_minutes: 10

steps:
- label: 'My Step'
  <<: [*prod, *timeout]
  command: echo 'Hello, world!'
`,
      });
    });

    it('should process multiple duplicate merge keys', async () => {
      const input = `
configs:
  environments:
    - &prod
      agents:
        queue: my-prod-queue
  base-steps:
    - &timeout
      timeout_in_minutes: 10

steps:
- <<: *prod
  <<: *timeout
  <<: *icantbebothereddefiningmorekeys
  label: 'My Step'
  command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({ result: 'apply' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml':
          mode === 'lint'
            ? input
            : `
configs:
  environments:
    - &prod
      agents:
        queue: my-prod-queue
  base-steps:
    - &timeout
      timeout_in_minutes: 10

steps:
- <<: [*prod, *timeout, *icantbebothereddefiningmorekeys]
  label: 'My Step'
  command: echo 'Hello, world!'
`,
      });
    });

    it('should handle comments', async () => {
      const input = `
steps:
- <<: *prod # hi
  <<: *timeout
  label: 'My Step'
  command: echo 'Hello, world!'

- <<: *prod
  <<: *timeout# hi
  label: 'My Step'
  command: echo 'Hello, world!'

- <<: *prod # hello
  <<: *timeout# world
  label: 'My Step'
  command: echo 'Hello, world!'

- label: something
  <<: *prod # hello
  <<: *timeout# world
  command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({ result: 'apply' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml':
          mode === 'lint'
            ? input
            : `
steps:
  # hi
- <<: [*prod, *timeout]
  label: 'My Step'
  command: echo 'Hello, world!'

  # hi
- <<: [*prod, *timeout]
  label: 'My Step'
  command: echo 'Hello, world!'

  # hello
  # world
- <<: [*prod, *timeout]
  label: 'My Step'
  command: echo 'Hello, world!'

- label: something
  # hello
  # world
  <<: [*prod, *timeout]
  command: echo 'Hello, world!'
`,
      });
    });

    it('should not bother if the keys are separated by other keys', async () => {
      const input = `steps:
  - <<: *prod
    label: 'My Step'
    <<: *timeout
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no duplicate merge keys found',
      });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should not merge when not at the same level', async () => {
      const input = `steps:
  - plugins:
      <<: *plugins
    <<: *timeout
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      await expect(
        tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no duplicate merge keys found',
      });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });
  });
});
