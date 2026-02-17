import memfs, { vol } from 'memfs';

import type { PatchConfig } from '../../index.js';

import { tryAddEmptyExports } from './addEmptyExports.js';

jest.mock('fs-extra', () => memfs);
jest.mock('fs', () => memfs);

const volToJson = () => vol.toJSON(process.cwd(), undefined, true);

const consoleLog = jest.spyOn(console, 'log').mockImplementation();

beforeEach(jest.clearAllMocks);
beforeEach(() => vol.reset());

describe('tryAddEmptyExports', () => {
  describe('format mode', () => {
    it('converts non-compliant Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
        'jest.setup.ts': '// jest.setup.ts',
        'jest.setup.int.ts': '// jest.setup.int.ts',
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "jest.setup.int.ts": "// jest.setup.int.ts

        export {};
        ",
          "jest.setup.ts": "// jest.setup.ts

        export {};
        ",
          "package.json": "{}",
        }
      `);
    });

    it('no-ops compliant Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
        'jest.setup.ts': "import './register';",
        'jest.setup.int.ts': 'export const foo = true;',
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "jest.setup.int.ts": "export const foo = true;",
          "jest.setup.ts": "import './register';",
          "package.json": "{}",
        }
      `);
    });

    it('no-ops non-existent Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "package.json": "{}",
        }
      `);
    });

    it('logs and continues on internal failure', async () => {
      vol.fromJSON({
        'jest.setup.ts': '// jest.setup.ts',
        'package.json': 'invalid',
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog.mock.calls.flat()).toEqual([
        'Failed to convert Jest setup files to isolated modules.',
        expect.stringMatching(/JSONError/),
      ]);
    });
  });

  describe('lint mode', () => {
    it('converts non-compliant Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
        'jest.setup.ts': '// jest.setup.ts',
        'jest.setup.int.ts': '// jest.setup.int.ts',
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "jest.setup.int.ts": "// jest.setup.int.ts",
          "jest.setup.ts": "// jest.setup.ts",
          "package.json": "{}",
        }
      `);
    });

    it('no-ops compliant Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
        'jest.setup.ts': "import './register';",
        'jest.setup.int.ts': 'export const foo = true;',
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "jest.setup.int.ts": "export const foo = true;",
          "jest.setup.ts": "import './register';",
          "package.json": "{}",
        }
      `);
    });

    it('no-ops non-existent Jest setup files', async () => {
      vol.fromJSON({
        'package.json': '{}',
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(volToJson()).toMatchInlineSnapshot(`
        {
          "package.json": "{}",
        }
      `);
    });

    it('logs and continues on internal failure', async () => {
      vol.fromJSON({
        'package.json': 'invalid',
        'jest.setup.ts': '// jest.setup.ts',
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog.mock.calls.flat()).toEqual([
        'Failed to convert Jest setup files to isolated modules.',
        expect.stringMatching(/JSONError/),
      ]);
    });
  });
});
