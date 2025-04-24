import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';

import { loadSkubaConfig } from './load';

const stdoutMock = jest.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

const skuba = path.join(__dirname, '../..');
let tempDir: string;

beforeAll(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skuba-config-load-'));
});

afterAll(() => fs.rm(tempDir, { recursive: true, force: true }));

beforeEach(() => {
  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));
});

afterEach(() => {
  jest.resetAllMocks();
});

it('should load default config from an empty directory', async () => {
  const dir = path.join(tempDir, 'empty');
  await fs.mkdir(dir, { recursive: true });

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['**/*.vocab/*translations.json'],
    buildTool: 'tsc',
    entryPoint: 'src/app.ts',
  });

  expect(stdout()).toBe('');
});

it('should load a basic config file', async () => {
  const dir = path.join(tempDir, 'basic-config');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'skuba.config.ts'),
    `export default {
        assets: ['my-data'],
        buildTool: 'esbuild',
        entryPoint: 'src/index.ts',
        ignoreMe: 'junk',
      };
    `,
  );

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['my-data'],
    buildTool: 'esbuild',
    entryPoint: 'src/index.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
    lastPatchedVersion: undefined,
  });

  expect(stdout()).toBe('');
});

it('should load a maximal config file', async () => {
  const dir = path.join(tempDir, 'maximal-config');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'skuba.config.ts'),
    `import { SkubaConfig } from '${path.join(skuba, 'config')}';

      const buildTool = 'esbuild' as const;

      // We're just ignoring type errors
      const x: string = 3;

      const config: SkubaConfig = {
        assets: [...SkubaConfig.assets.default, 'my-stuff'],
        buildTool,
        entryPoint: 'src/start.ts',
        ignoreMe: 'junk',
      };

      // Blah blah some blurb
      export const lastPatchedVersion
         = '1.2.3';

      export default config;
    `,
  );

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['**/*.vocab/*translations.json', 'my-stuff'],
    buildTool: 'esbuild',
    entryPoint: 'src/start.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
    lastPatchedVersion: '1.2.3',
  });

  expect(stdout()).toBe('');
});

it('should load a config file with a type-only SkubaConfig import', async () => {
  const dir = path.join(tempDir, 'type-only-import');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'skuba.config.ts'),
    `import type { SkubaConfig } from '${path.join(skuba, 'config')}';

      const config: SkubaConfig = {
        assets: ['my-stuff'],
        buildTool: 'esbuild',
        entryPoint: 'src/start.ts',
        ignoreMe: 'junk',
      };

      export const lastPatchedVersion = '1.2.3';

      export default config;
    `,
  );

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['my-stuff'],
    buildTool: 'esbuild',
    entryPoint: 'src/start.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
    lastPatchedVersion: '1.2.3',
  });

  expect(stdout()).toBe('');
});

it('should handle a config file with an empty config', async () => {
  const dir = path.join(tempDir, 'empty-config');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'skuba.config.ts'), ``);

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['**/*.vocab/*translations.json'],
    buildTool: 'tsc',
    entryPoint: 'src/app.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
  });

  expect(stdout()).toBe(`Failed to load ${dir}/skuba.config.ts.
Invalid config file: config: Required
`);
});

it('should handle a config not matching the schema', async () => {
  const dir = path.join(tempDir, 'invalid-config');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'skuba.config.ts'),
    `export default { entryPoint: 3 };`,
  );

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['**/*.vocab/*translations.json'],
    buildTool: 'tsc',
    entryPoint: 'src/app.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
  });

  expect(stdout()).toBe(`Failed to load ${dir}/skuba.config.ts.
Invalid config file: entryPoint: Expected string, received number
`);
});

it("should handle a config that can't be parsed", async () => {
  const dir = path.join(tempDir, 'unparsable-config');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'skuba.config.ts'),
    `export default { entryPoint: 'src/index.ts'`,
  );

  await expect(loadSkubaConfig(dir)).resolves.toStrictEqual({
    assets: ['**/*.vocab/*translations.json'],
    buildTool: 'tsc',
    entryPoint: 'src/app.ts',
    configPath: path.join(dir, 'skuba.config.ts'),
  });

  expect(stdout().replaceAll(/\s+$/gm, ''))
    .toBe(`Failed to load ${dir}/skuba.config.ts.
Error: ParseError: Unexpected token, expected ","
 ${dir}/skuba.config.ts:1:43`);
});
