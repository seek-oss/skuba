import * as fsExtra from 'fs-extra';

import { log } from '../../../utils/logging.js';

import { noSkubaTemplateJs } from './noSkubaTemplateJs.js';

const stdoutMock = jest.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
}));

beforeEach(() => {
  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));
});

afterEach(jest.resetAllMocks);

describe('noSkubaTemplateJs', () => {
  const pathExists = fsExtra.pathExists as jest.MockedFunction<
    (path: string) => Promise<boolean>
  >;

  describe.each`
    mode
    ${'format'}
    ${'lint'}
  `('$mode mode', ({ mode }) => {
    it('should report ok if skuba.template.js does not exist, and output nothing', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(false);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');

      expect(pathExists).toHaveBeenCalledTimes(1);
    });

    it('should report not ok + not fixable if skuba.template.js exists, and output a message', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(true);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: false,
        fixable: false,
        annotations: [
          {
            message: 'Template is incomplete; run pnpm exec skuba configure.',
            path: 'skuba.template.js',
          },
        ],
      });

      expect(stdout()).toBe(
        'Template is incomplete; run pnpm exec skuba configure. no-skuba-template-js\n',
      );

      expect(pathExists).toHaveBeenCalledTimes(1);
    });
  });
});
