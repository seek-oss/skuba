import path from 'path';

import fs from 'fs-extra';
import stripAnsi from 'strip-ansi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Git } from '../../../index.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import * as project from '../../configure/analysis/project.js';

import {
  REFRESHABLE_CONFIG_FILES,
  refreshConfigFiles,
} from './refreshConfigFiles.js';

const stdoutMock = vi.fn();

const stdout = () => stripAnsi(stdoutMock.mock.calls.flat(1).join(''));

vi.mock('fs-extra', () => ({
  default: { writeFile: vi.fn() },
}));

vi.mock('../../../utils/dir', () => ({
  findCurrentWorkspaceProjectRoot: () => '/some/workdir',
  findWorkspaceRoot: () => '/some/workdir',
}));

vi.mock('../../../utils/template', () => ({
  readBaseTemplateFile: (name: string) =>
    Promise.resolve(
      `# managed by skuba\nfake content for ${name}\n# end managed by skuba`,
    ),
}));

vi.mock('../../configure/analysis/project');

vi.mock('../../..', () => ({
  Git: {
    isFileGitIgnored: vi.fn(),
    findRoot: () => Promise.resolve('/path/to/git/root'),
  },
}));

const givenMockPackageManager = async (command: 'pnpm' | 'yarn') => {
  const actualPackageManager = await vi.importActual<
    typeof import('../../../utils/packageManager.js')
  >('../../../utils/packageManager.js');

  vi.mocked(detectPackageManager).mockResolvedValue(
    actualPackageManager.configForPackageManager(command),
  );
};

vi.mock('../../../utils/packageManager');

beforeEach(async () => {
  vi.spyOn(console, 'log').mockImplementation((...args) =>
    stdoutMock(`${args.join(' ')}\n`),
  );

  await givenMockPackageManager('pnpm');
});

afterEach(vi.resetAllMocks);

describe('refreshConfigFiles', () => {
  const writeFile = vi.mocked(fs.writeFile);
  const createDestinationFileReader = vi.mocked(
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
              'The .gitignore file is out of date. Run `pnpm exec skuba format` to update it.',
            path: '.gitignore',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The .gitignore file is out of date. Run \`pnpm exec skuba format\` to update it.
`);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should flag creation of a pnpm-workspace.yaml for pnpm projects if missing', async () => {
      setupDestinationFiles({
        'pnpm-workspace.yaml': undefined,
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: false,
        fixable: true,
        annotations: [
          {
            message:
              'The pnpm-workspace.yaml file is out of date. Run `pnpm exec skuba format` to update it.',
            path: 'pnpm-workspace.yaml',
          },
        ],
      });

      expect(`\n${stdout()}`).toBe(`
The pnpm-workspace.yaml file is out of date. Run \`pnpm exec skuba format\` to update it.
`);

      expect(writeFile).not.toHaveBeenCalled();
    });

    it('should not flag creation of a pnpm-workspace.yaml for yarn projects', async () => {
      await givenMockPackageManager('yarn');

      setupDestinationFiles({
        'pnpm-workspace.yaml': undefined,
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
      vi.mocked(Git.isFileGitIgnored).mockImplementation(({ absolutePath }) =>
        Promise.resolve(absolutePath.endsWith('.dockerignore')),
      );

      setupDestinationFiles({
        '.dockerignore': undefined,
      });

      await expect(refreshConfigFiles('lint', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

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

      expect(stdout()).toBe('Refreshed .gitignore.\n');

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), '.gitignore'),
        '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\n\nstuff afterwards',
      );
    });

    it('should create a pnpm-workspace.yaml for pnpm projects if missing', async () => {
      setupDestinationFiles({
        'pnpm-workspace.yaml': undefined,
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(`\n${stdout()}`).toBe(`
Refreshed pnpm-workspace.yaml.
`);

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        path.join(process.cwd(), 'pnpm-workspace.yaml'),
        '# managed by skuba\nfake content for _pnpm-workspace.yaml\n# end managed by skuba',
      );
    });

    it('should not create a pnpm-workspace.yaml for yarn projects if missing', async () => {
      await givenMockPackageManager('yarn');

      setupDestinationFiles({
        'pnpm-workspace.yaml': undefined,
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
      vi.mocked(Git.isFileGitIgnored).mockImplementation(({ absolutePath }) =>
        Promise.resolve(absolutePath.endsWith('.dockerignore')),
      );

      setupDestinationFiles({
        '.dockerignore': undefined,
      });

      await expect(refreshConfigFiles('format', log)).resolves.toEqual({
        ok: true,
        fixable: false,
        annotations: [],
      });

      expect(stdout()).toBe('');

      expect(writeFile).not.toHaveBeenCalled();
    });

    it.each(['.gitignore', '.dockerignore'])(
      'should remove old skuba warnings in %s',
      async (file) => {
        setupDestinationFiles({
          [file]: `# managed by skuba
fake content for _${file}
# end managed by skuba
stuff
other stuff
# Ignore .npmrc. This is no longer managed by skuba as pnpm projects use a managed .npmrc.
# IMPORTANT: if migrating to pnpm, remove this line and add an .npmrc IN THE SAME COMMIT.
# You can use \`skuba format\` to generate the file or otherwise commit an empty file.
# Doing so will conflict with a local .npmrc and make it more difficult to unintentionally commit auth secrets.
.npmrc


`,
        });

        await expect(refreshConfigFiles('format', log)).resolves.toEqual({
          ok: true,
          fixable: false,
          annotations: [],
        });

        expect(writeFile).toHaveBeenCalledWith(
          path.join(process.cwd(), file),
          `# managed by skuba\nfake content for _${file}\n# end managed by skuba\nstuff\nother stuff\n`,
        );
      },
    );

    it('should not strip !pnpm-workspace.yaml if ignored out of the managed file for no good reason', async () => {
      setupDestinationFiles({
        '.gitignore':
          '# managed by skuba\nfake content for _.gitignore\n# end managed by skuba\npnpm-workspace.yaml\n!pnpm-workspace.yaml\n',
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
