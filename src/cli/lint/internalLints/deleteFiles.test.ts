import path from 'path';

import * as fsExtra from 'fs-extra';

import { log } from '../../../utils/logging';

import { deleteFilesLint } from './deleteFiles';

const stdoutMock = jest.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

jest.mock('fs-extra', () => ({
  pathExists: jest.fn(),
  rm: jest.fn(),
}));

beforeEach(() => {
  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));
});

afterEach(jest.resetAllMocks);

describe('deleteFilesLint', () => {
  const pathExists = fsExtra.pathExists as jest.MockedFunction<
    (path: string) => Promise<boolean>
  >;
  const rm = jest.mocked(fsExtra.rm);

  describe('lint mode', () => {
    it('should report ok if no files to delete, and output nothing', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(false);

      await expect(deleteFilesLint('lint', log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(rm).not.toHaveBeenCalled();
    });

    it('should report not ok + fixable if files to delete, and output a message', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(true);

      await expect(deleteFilesLint('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message: 'This file should be deleted.',
            path: 'Dockerfile-incunabulum',
          },
        ],
      });

      expect(stdout()).toBe(
        'Some files should be deleted. Run pnpm exec skuba format to delete them. delete-files\n',
      );

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(rm).not.toHaveBeenCalled();
    });
  });

  describe('format mode', () => {
    it('should report ok if no files to delete, and delete or output nothing', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(false);

      await expect(deleteFilesLint('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('');

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(rm).not.toHaveBeenCalled();
    });

    it('should report ok if files to delete, and delete them and output filenames', async () => {
      jest.mocked(pathExists).mockResolvedValueOnce(true);

      await expect(deleteFilesLint('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
      });

      expect(stdout()).toBe('Deleting Dockerfile-incunabulum.\n');

      expect(pathExists).toHaveBeenCalledTimes(1);
      expect(rm).toHaveBeenCalledTimes(1);
      expect(rm).toHaveBeenCalledWith(
        path.join(process.cwd(), 'Dockerfile-incunabulum'),
        {
          force: true,
        },
      );
    });
  });
});
