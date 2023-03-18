import simpleGit from 'simple-git';

import * as Git from '../../api/git';
import * as GitHub from '../../api/github';
import { runESLint } from '../adapter/eslint';
import { runPrettier } from '../adapter/prettier';

import { AUTOFIX_IGNORE_FILES, autofix } from './autofix';

jest.mock('simple-git');
jest.mock('../../api/git');
jest.mock('../../api/github');
jest.mock('../adapter/eslint');
jest.mock('../adapter/prettier');

const MOCK_ERROR = new Error('Badness!');

const stdoutMock = jest.fn();

const stdout = () => {
  const result = stdoutMock.mock.calls
    .flat(1)
    .join('')
    .replace(/(at Object\.\<anonymous\>)[\s\S]+$/, '$1...');
  return `\n${result}`;
};

beforeEach(() => {
  delete process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_REF_PROTECTED;

  process.env.CI = 'true';

  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));

  jest.spyOn(Git, 'getChangedFiles').mockResolvedValue([]);
});

afterEach(jest.resetAllMocks);

describe('autofix', () => {
  const params = { debug: false, eslint: true, prettier: true };

  describe('GitHub Actions', () => {
    const push = jest.fn();

    const expectAutofixCommit = (
      { eslint, prettier }: Record<'eslint' | 'prettier', boolean> = {
        eslint: true,
        prettier: true,
      },
    ) => {
      expect(runESLint).toHaveBeenCalledTimes(eslint ? 1 : 0);
      expect(runPrettier).toHaveBeenCalledTimes(prettier ? 1 : 0);
      expect(Git.commitAllChanges).toHaveBeenCalledTimes(1);
    };

    const expectNoAutofix = () => {
      expect(runESLint).not.toHaveBeenCalled();
      expect(runPrettier).not.toHaveBeenCalled();
      expect(Git.commitAllChanges).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    };

    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      jest.mocked(simpleGit).mockReturnValue({ push } as any);
    });

    it('bails on a non-CI environment', async () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the master branch', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('master');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the main branch', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('main');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the Buildkite default branch', async () => {
      process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH = 'devel';

      jest.mocked(Git.currentBranch).mockResolvedValue('devel');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on a GitHub protected branch', async () => {
      process.env.GITHUB_REF_PROTECTED = 'true';

      jest.mocked(Git.currentBranch).mockResolvedValue('beta');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on an autofix head commit', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('feature');
      jest
        .mocked(Git.getHeadCommitMessage)
        .mockResolvedValue('Run `skuba format`');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on no fixable issues', async () => {
      await expect(
        autofix({ ...params, eslint: false, prettier: false }),
      ).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('skips push on empty commit', async () => {
      jest.mocked(Git.commitAllChanges).mockResolvedValue(undefined);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        No autofixes detected.
        "
      `);
    });

    it('uses Git CLI in GitHub Actions', async () => {
      process.env.GITHUB_ACTIONS = 'true';

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from ESLint only', async () => {
      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: true, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(push).toHaveBeenNthCalledWith(1);

      // We should run both ESLint and Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: true }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, prettier: true });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      // We should only run Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles codegen changes only', async () => {
      jest.spyOn(Git, 'getChangedFiles').mockResolvedValue([
        {
          path: '.gitignore',
          state: 'modified',
        },
      ]);

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, prettier: false });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to push codegen updates...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles nested Renovate changes only', async () => {
      jest.spyOn(Git, 'getChangedFiles').mockResolvedValue([
        {
          path: '.github/renovate.json5',
          state: 'modified',
        },
      ]);

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, prettier: false });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to push codegen updates...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('tolerates guard errors', async () => {
      const ERROR = new Error('badness!');

      jest.mocked(Git.currentBranch).mockRejectedValue(ERROR);
      jest.mocked(Git.getHeadCommitMessage).mockRejectedValue(ERROR);

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('bails on commit error', async () => {
      jest.mocked(Git.commitAllChanges).mockRejectedValue(MOCK_ERROR);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
            at Object.<anonymous>..."
      `);
    });
  });

  describe('Other CI', () => {
    const expectAutofixCommit = (
      { eslint, prettier }: Record<'eslint' | 'prettier', boolean> = {
        eslint: true,
        prettier: true,
      },
    ) => {
      expect(runESLint).toHaveBeenCalledTimes(eslint ? 1 : 0);
      expect(runPrettier).toHaveBeenCalledTimes(prettier ? 1 : 0);
      expect(GitHub.uploadAllFileChanges).toHaveBeenCalledTimes(1);
    };

    const expectNoAutofix = () => {
      expect(runESLint).not.toHaveBeenCalled();
      expect(runPrettier).not.toHaveBeenCalled();
      expect(GitHub.uploadAllFileChanges).not.toHaveBeenCalled();
    };

    it('bails on a non-CI environment', async () => {
      delete process.env.CI;

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the master branch', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('master');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the main branch', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('main');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the Buildkite default branch', async () => {
      process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH = 'devel';

      jest.mocked(Git.currentBranch).mockResolvedValue('devel');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on a GitHub protected branch', async () => {
      process.env.GITHUB_REF_PROTECTED = 'true';

      jest.mocked(Git.currentBranch).mockResolvedValue('beta');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on an autofix head commit', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('feature');
      jest
        .mocked(Git.getHeadCommitMessage)
        .mockResolvedValue('Run `skuba format`');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on no fixable issues', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('feature');

      await expect(
        autofix({ ...params, eslint: false, prettier: false }),
      ).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('skips push when there are no changes', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('feature');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        No autofixes detected.
        "
      `);
    });

    it('handles fixable issues from ESLint only', async () => {
      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: true, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        branch: 'dev',
        dir: expect.any(String),
        messageHeadline: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      // We should run both ESLint and Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: true }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, prettier: true });

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        branch: 'dev',
        dir: expect.any(String),
        messageHeadline: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      // We should only run Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with Prettier...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles codegen changes only', async () => {
      jest.spyOn(Git, 'getChangedFiles').mockResolvedValue([
        {
          path: '.gitignore',
          state: 'modified',
        },
      ]);

      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, prettier: false });

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        branch: 'dev',
        dir: expect.any(String),
        messageHeadline: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES,
      });

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to push codegen updates...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('logs a warning when the current branch cannot be determined', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue(undefined);

      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');

      await expect(autofix(params)).resolves.toBeUndefined();

      expect(GitHub.uploadAllFileChanges).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Could not determine the current branch.
        Please propagate BUILDKITE_BRANCH, GITHUB_HEAD_REF, GITHUB_REF_NAME, or the .git directory to your container.
        "
      `);
    });

    it('bails on commit error', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      jest.mocked(GitHub.uploadAllFileChanges).mockRejectedValue(MOCK_ERROR);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(Git.push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Trying to autofix with ESLint and Prettier...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
            at Object.<anonymous>..."
      `);
    });
  });
});
