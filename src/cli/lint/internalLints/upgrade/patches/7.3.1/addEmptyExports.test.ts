import fs from 'fs-extra';

import type { PatchConfig } from '../..';
import * as packageAnalysis from '../../../../../configure/analysis/package';
import * as projectAnalysis from '../../../../../configure/analysis/project';

import { tryAddEmptyExports } from './addEmptyExports';

jest
  .spyOn(packageAnalysis, 'getDestinationManifest')
  .mockResolvedValue({ path: '~/project/package.json' } as any);

const createDestinationFileReader = jest
  .spyOn(projectAnalysis, 'createDestinationFileReader')
  .mockReturnValue(() => {
    throw new Error('Not implemented!');
  });

const writeFile = jest.spyOn(fs.promises, 'writeFile').mockResolvedValue();

beforeEach(jest.clearAllMocks);

describe('tryAddEmptyExports', () => {
  describe('format mode', () => {
    it('converts non-compliant Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue((filename) =>
        Promise.resolve(`// ${filename}`),
      );

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(writeFile.mock.calls.flat().join('\n')).toMatchInlineSnapshot(`
        "~/project/jest.setup.ts
        // jest.setup.ts

        export {};

        ~/project/jest.setup.int.ts
        // jest.setup.int.ts

        export {};
        "
      `);
    });

    it('no-ops compliant Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue(
        (filename) =>
          new Promise((resolve, reject) => {
            switch (filename) {
              case 'jest.setup.ts':
                return resolve("import './register';");
              case 'jest.setup.int.ts':
                return resolve('export const foo = true;');
              default:
                return reject(new Error(`Not implemented: ${filename}`));
            }
          }),
      );

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('no-ops non-existent Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(undefined),
      );

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('logs and continues on internal failure', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      createDestinationFileReader.mockReturnValue(() => {
        throw new Error('Something happened!');
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(writeFile).not.toHaveBeenCalled();

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog.mock.calls.flat()).toEqual([
        'Failed to convert Jest setup files to isolated modules.',
        expect.stringMatching(/^Error: Something happened!/),
      ]);
    });
  });

  describe('lint mode', () => {
    it('converts non-compliant Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue((filename) =>
        Promise.resolve(`// ${filename}`),
      );

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'apply',
      });

      expect(writeFile.mock.calls).toHaveLength(0);
    });

    it('no-ops compliant Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue(
        (filename) =>
          new Promise((resolve, reject) => {
            switch (filename) {
              case 'jest.setup.ts':
                return resolve("import './register';");
              case 'jest.setup.int.ts':
                return resolve('export const foo = true;');
              default:
                return reject(new Error(`Not implemented: ${filename}`));
            }
          }),
      );

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('no-ops non-existent Jest setup files', async () => {
      createDestinationFileReader.mockReturnValue(() =>
        Promise.resolve(undefined),
      );

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
      });

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('logs and continues on internal failure', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();

      createDestinationFileReader.mockReturnValue(() => {
        throw new Error('Something happened!');
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(writeFile).not.toHaveBeenCalled();

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog.mock.calls.flat()).toEqual([
        'Failed to convert Jest setup files to isolated modules.',
        expect.stringMatching(/^Error: Something happened!/),
      ]);
    });
  });
});
