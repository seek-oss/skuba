import path from 'path';

import * as fsExtra from 'fs-extra';

import { Git } from '../../..';
import { log } from '../../../utils/logging';
import { detectPackageManager } from '../../../utils/packageManager';
import * as project from '../../configure/analysis/project';

import {
  REFRESHABLE_CONFIG_FILES,
  refreshConfigFiles,
} from './refreshConfigFiles';

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

jest.mock('../../..', () => ({
  Git: {
    isFileGitIgnored: jest.fn(),
    findRoot: () => Promise.resolve('/path/to/git/root'),
  },
}));

const givenMockPackageManager = (command: 'pnpm' | 'yarn') => {
  jest
    .mocked(detectPackageManager)
    .mockResolvedValue(
      jest
        .requireActual('../../../utils/packageManager')
        .configForPackageManager(command),
    );
};

jest.mock('../../../utils/packageManager');

beforeEach(() => {
  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

  givenMockPackageManager('pnpm');
});

afterEach(jest.resetAllMocks);

describe('refreshConfigFiles', () => {
  const writeFile = jest.mocked(fsExtra.writeFile);
  const createDestinationFileReader = jest.mocked(
    project.createDestinationFileReader,
  );

  function setupDestinationFiles(data: Record<string, string | undefined>) {
    const contents = {
      ...Object.fromEntries(
        REFRESHABLE_CONFIG_FILES.map((f) => [
          f.name,
          `# managed by skuba\nfake content for _${f.name}\n# end managed by skuba\n`,
        ]),
      ),
      ...data,
    };

    createDestinationFileReader.mockImplementation(
      () => (filename: string) => Promise.resolve(contents[filename]),
    );
  }

  describe('lint mode', () => {
    it('should report ok if files are up to date, and output nothing', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
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

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
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
The .eslintignore file is out of date. Run \`pnpm exec skuba format\` to update it. refresh-config-files
The .gitignore file is out of date. Run \`pnpm exec skuba format\` to update it. refresh-config-files
`);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should flag an .npmrc containing authToken even if otherwise up to date', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
        '.npmrc':
          '# managed by skuba\nfake content for _.npmrc\n# end managed by skuba\n//registry.npmjs.org/:_authToken=not-a-real-token',
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message:
              'The .npmrc file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.npmrc',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The .npmrc file is out of date. Run \`pnpm exec skuba format\` to update it. refresh-config-files
`);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should flag creation of an .npmrc for pnpm projects if missing', async () => {
      setupDestinationFiles({
        '.npmrc': undefined,
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message:
              'The .npmrc file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.npmrc',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The .npmrc file is out of date. Run \`pnpm exec skuba format\` to update it. refresh-config-files
`);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should not flag creation of an .npmrc for yarn projects', async () => {
      givenMockPackageManager('yarn');

      setupDestinationFiles({
        '.npmrc': undefined,
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should not flag creation of files that are `.gitignore`d', async () => {
      jest
        .mocked(Git.isFileGitIgnored)
        .mockImplementation(({ absolutePath }) =>
          Promise.resolve(absolutePath.endsWith('.eslintignore')),
        );

      setupDestinationFiles({
        '.eslintignore': undefined,
        '.dockerignore': undefined,
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message:
              'The .dockerignore file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.dockerignore',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The .dockerignore file is out of date. Run \`pnpm exec skuba format\` to update it. refresh-config-files
`);

      expect(writeFile).not.toHaveBeenCalled();
    });
  });

  describe('format mode', () => {
    it('should report ok if files are up to date, and write or output nothing', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
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

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe(
        'Refreshed .eslintignore. refresh-config-files\nRefreshed .gitignore. refresh-config-files\n',
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

    it('should strip an authToken line from an .npmrc file', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
        '.npmrc':
          '# managed by skuba\nfake content for _.npmrc\n# end managed by skuba\n//registry.npmjs.org/:_authToken=not-a-real-token',
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(`\n${stdout()}`).toBe(
        '\nRefreshed .npmrc. refresh-config-files\n',
      );

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.npmrc'),
        '# managed by skuba\nfake content for _.npmrc\n# end managed by skuba',
      );
    });

    it('should create an .npmrc for pnpm projects if missing', async () => {
      setupDestinationFiles({
        '.npmrc': undefined,
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(`\n${stdout()}`).toBe(`
Refreshed .npmrc. refresh-config-files
`);

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.npmrc'),
        '# managed by skuba\nfake content for _.npmrc\n# end managed by skuba',
      );
    });

    it('should not create an .npmrc for yarn projects if missing', async () => {
      givenMockPackageManager('yarn');

      setupDestinationFiles({
        '.npmrc': undefined,
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should not create files that are `.gitignore`d', async () => {
      jest
        .mocked(Git.isFileGitIgnored)
        .mockImplementation(({ absolutePath }) =>
          Promise.resolve(absolutePath.endsWith('.eslintignore')),
        );

      setupDestinationFiles({
        '.eslintignore': undefined,
        '.dockerignore': undefined,
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(`\n${stdout()}`).toBe(`
Refreshed .dockerignore. refresh-config-files
`);

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.dockerignore'),
        '# managed by skuba\nfake content for _.dockerignore\n# end managed by skuba',
      );
    });

    it('should format an extraneous !.npmrc', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\nstuff\n!.npmrc\n!/.npmrc\nother stuff',
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.gitignore'),
        '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\nstuff\nother stuff',
      );
    });

    it('should also manage .dockerignore', async () => {
      setupDestinationFiles({
        '.dockerignore':
          '# managed by skuba\nfake content for _.dockerignore\n# end managed by skuba\nstuff\n!.npmrc\n!/.npmrc\nother stuff',
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.dockerignore'),
        '# managed by skuba\nfake content for _.dockerignore\n# end managed by skuba\nstuff\nother stuff',
      );
    });

    it('should not strip !.npmrc if ignored out of the managed file for no good reason', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n.npmrc\n!.npmrc\n',
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(writeFile).not.toHaveBeenCalledWith(
        path.join(process.cwd(), '.gitignore'),
        expect.any(String),
      );
    });
  });
});
