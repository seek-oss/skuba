import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pathExists } from '../../../utils/fs.js';
import { log } from '../../../utils/logging.js';
import { getConsumerManifest } from '../../../utils/manifest.js';

import { noSkubaTemplateJs } from './noSkubaTemplateJs.js';

const stdoutMock = vi.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

vi.mock('../../../utils/fs.js', () => ({
  pathExists: vi.fn(),
}));
vi.mock('../../../utils/manifest.js');

beforeEach(() => {
  vi.mocked(getConsumerManifest).mockResolvedValue({
    packageJson: {
      skuba: { version: '1.0.0' },
      _id: 'test',
      name: 'test',
      readme: '',
      version: '1.0.0',
    },
    path: '/project/package.json',
  });
  vi.spyOn(console, 'log').mockImplementation((...args) =>
    stdoutMock(`${args.join(' ')}\n`),
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('noSkubaTemplateJs', () => {
  describe.each`
    mode
    ${'format'}
    ${'lint'}
  `('$mode mode', ({ mode }) => {
    it('should report ok in a template repository', async () => {
      vi.mocked(getConsumerManifest).mockResolvedValueOnce({
        packageJson: {
          _id: 'test',
          name: 'test-template',
          readme: '',
          version: '1.0.0',
        },
        path: '/template/package.json',
      });
      vi.mocked(pathExists).mockResolvedValueOnce(true);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');
      expect(pathExists).not.toHaveBeenCalled();
    });

    it('should report ok if skuba.template.js does not exist, and output nothing', async () => {
      vi.mocked(pathExists).mockResolvedValueOnce(false);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');

      expect(pathExists).toHaveBeenCalledTimes(1);
    });

    it('should report not ok + not fixable if skuba.template.js exists, and output a message', async () => {
      vi.mocked(pathExists).mockResolvedValueOnce(true);

      await expect(noSkubaTemplateJs(mode, log)).resolves.toEqual({
        ok: false,
        fixable: false,
        annotations: [
          {
            message:
              'Template is incomplete; run `skuba init` to resume templating.',
            path: 'skuba.template.js',
          },
        ],
      });

      expect(stdout()).toBe(
        'Template is incomplete; run skuba init to resume templating. no-skuba-template-js\n',
      );

      expect(pathExists).toHaveBeenCalledTimes(1);
    });
  });
});
