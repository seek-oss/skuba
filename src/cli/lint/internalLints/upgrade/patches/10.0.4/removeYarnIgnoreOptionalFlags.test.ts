import memfs, { vol } from 'memfs';

import { configForPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchConfig } from '../../index.js';

import { tryRemoveYarnIgnoreOptionalFlags } from './removeYarnIgnoreOptionalFlags.js';

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

jest.mock('fs', () => memfs);
jest.mock('fast-glob', () => ({
  glob: (pat: any, opts: any) =>
    jest.requireActual('fast-glob').glob(pat, { ...opts, fs: memfs }),
}));

beforeEach(() => vol.reset());

describe('removeYarnIgnoreOptionalFlags', () => {
  const baseArgs = {
    manifest: {} as PatchConfig['manifest'],
    packageManager: configForPackageManager('yarn'),
  };

  afterEach(() => jest.resetAllMocks());

  describe.each(['lint', 'format'] as const)('%s', (mode) => {
    it('should skip if no Dockerfile files are found', async () => {
      await expect(
        tryRemoveYarnIgnoreOptionalFlags({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Dockerfiles found',
      });

      expect(volToJson()).toEqual({});
    });

    it('should skip if no yarn --ignore-optional flags are found', async () => {
      const input = `
RUN pnpm install
# etc
`;
      const input2 = `${input}\nRUN yarn install stuff`;

      vol.fromJSON({
        Dockerfile: input,
        'Dockerfile.dev-deps': input2,
      });

      await expect(
        tryRemoveYarnIgnoreOptionalFlags({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'no Dockerfiles to patch',
      });

      expect(volToJson()).toEqual({
        Dockerfile: input,
        'Dockerfile.dev-deps': input2,
      });
    });

    it('should handle a variety of formats', async () => {
      const inputVolume = {
        'Dockerfile.no':
          'yarn\nRUN stuff --ignore-optional\n RUN other-stuff \\\n --ignore-optional\n',
        'Dockerfile.oneline':
          '# stuff\nRUN yarn install --ignore-optional\n# other-stuff\n',
        'Dockerfile.other-args':
          'RUN yarn install --frozen-lockfile --ignore-optional --other-arg\n',
        'Dockerfile.newline': 'RUN yarn install \\\n --ignore-optional\n',
        'Dockerfile.newline-with-more-after':
          'RUN yarn install \\\n --ignore-optional\\\n --other-arg\n',
        'Dockerfile.newline-multiple-args':
          'RUN yarn install \\\n --ignore-optional --other-arg\n',
      };

      vol.fromJSON(inputVolume);

      await expect(
        tryRemoveYarnIgnoreOptionalFlags({
          ...baseArgs,
          mode,
        }),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toEqual(
        mode === 'lint'
          ? inputVolume
          : {
              'Dockerfile.no':
                'yarn\nRUN stuff --ignore-optional\n RUN other-stuff \\\n --ignore-optional\n',
              'Dockerfile.oneline':
                '# stuff\nRUN yarn install\n# other-stuff\n',
              'Dockerfile.other-args':
                'RUN yarn install --frozen-lockfile --other-arg\n',
              'Dockerfile.newline': 'RUN yarn install\n',
              'Dockerfile.newline-with-more-after':
                'RUN yarn install \\\n --other-arg\n',
              'Dockerfile.newline-multiple-args':
                'RUN yarn install \\\n --other-arg\n',
            },
      );
    });
  });
});
