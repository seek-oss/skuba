import path from 'path';

import * as fsExtra from 'fs-extra';

import { log } from '../../../utils/logging';
import * as project from '../../configure/analysis/project';

import { refreshIgnoreFiles } from './refreshIgnoreFiles';

const stdoutMock = jest.fn();

const stdout = () => stdoutMock.mock.calls.flat(1).join('');

jest.mock('fs-extra', () => ({
  writeFile: jest.fn(),
}));

jest.mock('../../../utils/template', () => ({
  readBaseTemplateFile: (name: string) =>
    Promise.resolve(
      `# managed by skuba\nfake content for ${name}\n# end managed by skuba`,
    ),
}));

jest.mock('../../configure/analysis/project');

beforeEach(() => {
  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));
});

afterEach(jest.resetAllMocks);

describe('refreshIgnoreFiles', () => {
  const writeFile = jest.mocked(fsExtra.writeFile);
  const createDestinationFileReader = jest.mocked(
    project.createDestinationFileReader,
  );

  function setupDestinationFiles(data: Record<string, string>) {
    createDestinationFileReader.mockImplementation(
      () => (filename: string) => Promise.resolve(data[filename]),
    );
  }

  describe('lint mode', () => {
    it('should report ok if files are up to date, and output nothing', async () => {
      setupDestinationFiles({
        '.eslintignore':
          '# managed by skuba\nfake content for _.eslintignore\n# end managed by skuba',
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
        '.prettierignore':
          '# managed by skuba\nfake content for _.prettierignore\n# end managed by skuba',
      });

      await expect(refreshIgnoreFiles('lint', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should report not ok + fixable if files are out of date, and output a message', async () => {
      setupDestinationFiles({
        '.eslintignore':
          '# managed by skuba\nfake content for _.eslintignore\nextra# end managed by skuba',
        '.gitignore':
          '# managed by skuba\n# end managed by skuba\n\nstuff afterwards',
        '.prettierignore':
          '# managed by skuba\nfake content for _.prettierignore\n# end managed by skuba\nstuff afterwards',
      });

      await expect(refreshIgnoreFiles('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message:
              'The .eslintignore file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.eslintignore',
          },
          {
            message:
              'The .gitignore file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.gitignore',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The .eslintignore file is out of date. Run pnpm exec skuba format to update it. refresh-ignore-files
The .gitignore file is out of date. Run pnpm exec skuba format to update it. refresh-ignore-files
`);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('format mode', () => {
    it('should report ok if files are up to date, and write or output nothing', async () => {
      setupDestinationFiles({
        '.eslintignore':
          '# managed by skuba\nfake content for _.eslintignore\n# end managed by skuba',
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
        '.prettierignore':
          '# managed by skuba\nfake content for _.prettierignore\n# end managed by skuba',
      });

      await expect(refreshIgnoreFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should report ok if files are out of date, and update them and output filenames', async () => {
      setupDestinationFiles({
        '.eslintignore':
          '# managed by skuba\nfake content for _.eslintignore\nextra# end managed by skuba',
        '.gitignore':
          '# managed by skuba\n# end managed by skuba\n\nstuff afterwards',
        '.prettierignore':
          '# managed by skuba\nfake content for _.prettierignore\n# end managed by skuba\nstuff afterwards',
      });

      await expect(refreshIgnoreFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe(
        'Refreshed .eslintignore. refresh-ignore-files\nRefreshed .gitignore. refresh-ignore-files\n',
      );

      expect(writeFile).toHaveBeenCalledTimes(2);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.eslintignore'),
        '# managed by skuba\nfake content for _.eslintignore\n# end managed by skuba',
      );
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.gitignore'),
        '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
      );
    });
  });
});
