import memfs, { vol } from 'memfs';

import { copyAssets } from './assets';

jest.mock('fs', () => memfs);
jest.mock('fs-extra', () => memfs);

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    'package.json': JSON.stringify({
      skuba: {
        assets: ['**/*.vocab/*trans.json'],
      },
    }),
    'src/app.ts': '',
    'src/.vocab/index.ts': '',
    'src/.vocab/trans.json': '',
    'src/.vocab/id.trans.json': '',
    'src/.vocab/th.trans.json': '',
    'src/other.vocab/index.ts': '',
    'src/other.vocab/trans.json': '',
    'src/other.vocab/id.trans.json': '',
    'src/other.vocab/th.trans.json': '',
  });
});

describe('copyAssets', () => {
  it('should copy the specified assets to the destination directory', async () => {
    const { log } = jest.createMockFromModule<
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports
      typeof import('../../utils/logging')
    >('../../utils/logging');
    await copyAssets('lib', log);

    expect(vol.toJSON(['.'], {}, true)).toMatchInlineSnapshot(`
      {
        "lib/.vocab/id.trans.json": "",
        "lib/.vocab/th.trans.json": "",
        "lib/.vocab/trans.json": "",
        "lib/other.vocab/id.trans.json": "",
        "lib/other.vocab/th.trans.json": "",
        "lib/other.vocab/trans.json": "",
        "package.json": "{"skuba":{"assets":["**/*.vocab/*trans.json"]}}",
        "src/.vocab/id.trans.json": "",
        "src/.vocab/index.ts": "",
        "src/.vocab/th.trans.json": "",
        "src/.vocab/trans.json": "",
        "src/app.ts": "",
        "src/other.vocab/id.trans.json": "",
        "src/other.vocab/index.ts": "",
        "src/other.vocab/th.trans.json": "",
        "src/other.vocab/trans.json": "",
      }
    `);
  });
});
