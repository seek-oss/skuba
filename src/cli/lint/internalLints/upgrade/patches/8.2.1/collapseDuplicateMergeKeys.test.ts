import memfs, { vol } from 'memfs';
import fsp from 'fs/promises';

import type { PatchConfig } from '../..';

import { tryCollapseDuplicateMergeKeys } from './collapseDuplicateMergeKeys';
import { configForPackageManager } from '../../../../../../utils/packageManager';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs-extra', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

describe('collapseDuplicateMergeKeys', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('pnpm'),
  };

  afterEach(() => jest.resetAllMocks());

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

        expect(
          await tryCollapseDuplicateMergeKeys({
            ...baseArgs,
            mode,
          }),
        ).toEqual({ result: 'skip', reason: 'no duplicate merge keys found' });

        expect(volToJson()).toEqual({
          '.buildkite/pipeline.yml': contents,
        });
      }
    });

    it('should skip if no Buildkite files are found', async () => {
      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'skip', reason: 'no Buildkite files found' });

      expect(volToJson()).toEqual({});
    });

    it('should skip if no duplicate merge keys are found', async () => {
      let input = `
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

      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'skip', reason: 'no duplicate merge keys found' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should process 2 duplicate merge keys', async () => {
      let input = `
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

      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'apply' });

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
      let input = `
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

      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'apply' });

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

    it('should not bother if the keys are separated by other keys', async () => {
      let input = `steps:
  - <<: *prod
    label: 'My Step'
    <<: *timeout
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'skip', reason: 'no duplicate merge keys found' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });

    it('should not merge when not at the same level', async () => {
      let input = `steps:
  - plugins:
      <<: *plugins
    <<: *timeout
    command: echo 'Hello, world!'
`;

      vol.fromJSON({
        '.buildkite/pipeline.yml': input,
      });

      expect(
        await tryCollapseDuplicateMergeKeys({
          ...baseArgs,
          mode,
        }),
      ).toEqual({ result: 'skip', reason: 'no duplicate merge keys found' });

      expect(volToJson()).toEqual({
        '.buildkite/pipeline.yml': input,
      });
    });
  });
});