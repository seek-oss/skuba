import memfs, { vol } from 'memfs';

import { copyAssets, copyAssetsConcurrently } from './assets';

jest.mock('fs', () => memfs);
jest.mock('fs-extra', () => memfs);

jest
  .spyOn(console, 'log')
  .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

const stdoutMock = jest.fn().mockName('[stdout]');
const getStdOut = () => `${stdoutMock.name}${stdoutMock.mock.calls.join('')}`;

// a snapshot serializer to remove quotes around stdout
expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && val.startsWith(stdoutMock.name),
  print: (val) => (val as string).trim().replace(stdoutMock.name, ''),
});

// the glob in package.json breaks syntax highlighting in VS Code
const justOutDirs = (fs: typeof vol) =>
  Object.fromEntries(
    Object.entries(fs.toJSON(['.'], {}, true)).filter(
      ([key]) => !(key.includes('package.json') || key.includes('src/')),
    ),
  );

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    'package.json': JSON.stringify({
      skuba: {
        assets: ['**/*.vocab/*translations.json'],
        entryPoint: 'src/index.ts',
      },
    }),
    'src/app.ts': '',
    'src/.vocab/index.ts': '',
    'src/.vocab/translations.json': '',
    'src/.vocab/th.translations.json': '',
    'src/other.vocab/index.ts': '',
    'src/other.vocab/translations.json': '',
    'src/other.vocab/th.translations.json': '',
  });
  jest.clearAllMocks();
});

describe('copyAssets', () => {
  it('should copy the assets specified in skuba config to the destination directory', async () => {
    await copyAssets('lib');

    expect(justOutDirs(vol)).toMatchInlineSnapshot(`
      {
        "lib/.vocab/th.translations.json": "",
        "lib/.vocab/translations.json": "",
        "lib/other.vocab/th.translations.json": "",
        "lib/other.vocab/translations.json": "",
      }
    `);
    expect(getStdOut()).toMatchInlineSnapshot(`
      Copying .vocab/th.translations.json
      Copying .vocab/translations.json
      Copying other.vocab/th.translations.json
      Copying other.vocab/translations.json
    `);
  });
});

describe('copyAssetsConcurrently', () => {
  it('should copy the assets specified in skuba config to the destination directories', async () => {
    await copyAssetsConcurrently([
      {
        outDir: 'lib-commonjs',
        name: 'commonjs',
        prefixColor: 'green',
      },
      {
        outDir: 'lib-esm',
        name: 'esm',
        prefixColor: 'yellow',
      },
    ]);

    expect(justOutDirs(vol)).toMatchInlineSnapshot(`
      {
        "lib-commonjs/.vocab/th.translations.json": "",
        "lib-commonjs/.vocab/translations.json": "",
        "lib-commonjs/other.vocab/th.translations.json": "",
        "lib-commonjs/other.vocab/translations.json": "",
        "lib-esm/.vocab/th.translations.json": "",
        "lib-esm/.vocab/translations.json": "",
        "lib-esm/other.vocab/th.translations.json": "",
        "lib-esm/other.vocab/translations.json": "",
      }
    `);
    expect(getStdOut()).toMatchInlineSnapshot(`
      commonjs │ Copying .vocab/th.translations.json
      commonjs │ Copying .vocab/translations.json
      commonjs │ Copying other.vocab/th.translations.json
      commonjs │ Copying other.vocab/translations.json
      esm   │ Copying .vocab/th.translations.json
      esm   │ Copying .vocab/translations.json
      esm   │ Copying other.vocab/th.translations.json
      esm   │ Copying other.vocab/translations.json
    `);
  });
});
