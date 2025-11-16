import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as packageAnalysis from '../../../../../configure/analysis/package.js';
import * as projectAnalysis from '../../../../../configure/analysis/project.js';
import type { PatchConfig } from '../../index.js';

import { tryAddEmptyExports } from './addEmptyExports.js';

// eslint-disable-next-line @typescript-eslint/no-empty-function
vi.spyOn(console, 'log').mockImplementation(() => {});

vi.spyOn(packageAnalysis, 'getDestinationManifest').mockResolvedValue({
  path: '~/project/package.json',
} as any);

const createDestinationFileReader = vi
  .spyOn(projectAnalysis, 'createDestinationFileReader')
  .mockReturnValue(() => {
    throw new Error('Not implemented!');
  });

const writeFile = vi.spyOn(fs.promises, 'writeFile').mockResolvedValue();

beforeEach(vi.clearAllMocks);

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
      const consoleLog = vi.spyOn(console, 'log');
      const error = new Error('Something happened!');

      createDestinationFileReader.mockReturnValue(() => {
        throw error;
      });

      await expect(
        tryAddEmptyExports({ mode: 'format' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(writeFile).not.toHaveBeenCalled();

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to convert Jest setup files to isolated modules.',
        ),
      );
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(error.toString()),
      );
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
      const consoleLog = vi.spyOn(console, 'log');
      const error = new Error('Something happened!');

      createDestinationFileReader.mockReturnValue(() => {
        throw error;
      });

      await expect(
        tryAddEmptyExports({ mode: 'lint' } as PatchConfig),
      ).resolves.toEqual({
        result: 'skip',
        reason: 'due to an error',
      });

      expect(writeFile).not.toHaveBeenCalled();

      expect(consoleLog).toHaveBeenCalledTimes(2);
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to convert Jest setup files to isolated modules.',
        ),
      );

      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringContaining(error.toString()),
      );
    });
  });
});
