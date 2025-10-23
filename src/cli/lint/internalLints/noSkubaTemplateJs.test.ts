import * as fsExtra from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { log } from '../../../utils/logging.js';

import { noSkubaTemplateJs } from './noSkubaTemplateJs.js';

const stdoutMock = vi.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

vi.mock('fs-extra', () => ({
  pathExists: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation((...args) =>
    stdoutMock(`${args.join(' ')}\n`),
  );
});

afterEach(vi.resetAllMocks);

describe('noSkubaTemplateJs', () => {
  const pathExists = vi.mocked(fsExtra.pathExists);

  describe.each`
    mode
    ${'format'}
    ${'lint'}
  `('$mode mode', ({ mode }) => {
    it('should report ok if skuba.template.js does not exist, and output nothing', async () => {
      vi.mocked(pathExists).mockResolvedValueOnce(false as never);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');

      expect(pathExists).toHaveBeenCalledTimes(1);
    });

    it('should report not ok + not fixable if skuba.template.js exists, and output a message', async () => {
      vi.mocked(pathExists).mockResolvedValueOnce(true as never);

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
