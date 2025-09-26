import simpleGit from 'simple-git';

import { runESLint } from '../adapter/eslint.js';
import { runPrettier } from '../adapter/prettier.js';
import { createDestinationFileReader } from '../configure/analysis/project.js';

import {
  AUTOFIX_IGNORE_FILES_BASE,
  AUTOFIX_IGNORE_FILES_NPMRC,
  autofix,
} from './autofix.js';
import { internalLint } from './internal.js';

import * as Buildkite from '@skuba-lib/api/buildkite';
import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

jest.mock('simple-git');
jest.mock('@skuba-lib/api/buildkite');
jest.mock('@skuba-lib/api/git');
jest.mock('@skuba-lib/api/github');
jest.mock('../adapter/eslint');
jest.mock('../adapter/prettier');
jest.mock('./internal');
jest.mock('../configure/analysis/project');

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

  jest.mocked(Git.getChangedFiles).mockResolvedValue([]);

  jest
    .mocked(createDestinationFileReader)
    .mockReturnValue(jest.fn().mockResolvedValue(null));
});

afterEach(jest.resetAllMocks);

describe('autofix', () => {
  const params = {
    debug: false,
    eslint: true,
    prettier: true,
    internal: true,
  };

  describe('GitHub Actions', () => {
    const push = jest.fn();

    const expectAutofixCommit = (
      { eslint, internal }: Record<'eslint' | 'internal', boolean> = {
        eslint: true,
        internal: true,
      },
    ) => {
      expect(runESLint).toHaveBeenCalledTimes(eslint ? 1 : 0);
      expect(runPrettier).toHaveBeenCalledTimes(1);
      expect(internalLint).toHaveBeenCalledTimes(internal ? 1 : 0);
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

    it('bails on a renovate branch when there is no open pull request', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('renovate-skuba-7.x');
      jest
        .mocked(GitHub.getPullRequestNumber)
        .mockRejectedValue(
          new Error(
            `Commit cdd1520 is not associated with an open GitHub pull request`,
          ),
        );

      await expect(autofix(params)).resolves.toBeUndefined();

      expect(Buildkite.annotate).toHaveBeenCalled();

      expectNoAutofix();
    });

    it('suceeds on a renovate branch when there is an open pull request associated with the commit', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('renovate-skuba-7.x');
      jest.mocked(GitHub.getPullRequestNumber).mockResolvedValue(6);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
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
        .mockResolvedValue('Run `skuba format`\n');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on no fixable issues', async () => {
      await expect(
        autofix({ ...params, eslint: false, prettier: false, internal: false }),
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
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

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (ESLint, skuba, Prettier)...
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, internal: false, prettier: true }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, internal: false });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      // We should only run Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles internal changes only', async () => {
      jest.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.gitignore',
          state: 'modified',
        },
      ]);

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, prettier: false, internal: true }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, internal: true });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, Prettier)...
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
            at Object.<anonymous>..."
      `);
    });

    it('will ignore .npmrc if it has auth secrets', async () => {
      jest.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.npmrc',
          state: 'modified',
        },
      ]);

      jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');
      jest
        .mocked(createDestinationFileReader)
        .mockReturnValue(jest.fn().mockResolvedValue('_authToken'));

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: true, internal: true });

      expect(Git.commitAllChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        message: 'Run `skuba format`',

        ignore: [...AUTOFIX_IGNORE_FILES_BASE, ...AUTOFIX_IGNORE_FILES_NPMRC],
      });

      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });
  });

  describe('Other CI', () => {
    const expectAutofixCommit = (
      { eslint, internal }: Record<'eslint' | 'internal', boolean> = {
        eslint: true,
        internal: true,
      },
    ) => {
      expect(runESLint).toHaveBeenCalledTimes(eslint ? 1 : 0);
      expect(runPrettier).toHaveBeenCalledTimes(1);
      expect(internalLint).toHaveBeenCalledTimes(internal ? 1 : 0);
      expect(GitHub.uploadAllFileChanges).toHaveBeenCalledTimes(1);
    };

    const expectNoAutofix = () => {
      expect(runESLint).not.toHaveBeenCalled();
      expect(runPrettier).not.toHaveBeenCalled();
      expect(internalLint).not.toHaveBeenCalled();
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
        autofix({ ...params, eslint: false, prettier: false, internal: false }),
      ).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('skips push when there are no changes', async () => {
      jest.mocked(Git.currentBranch).mockResolvedValue('feature');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (ESLint, skuba, Prettier)...
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

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      // We should run both ESLint and Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');

      await expect(
        autofix({ ...params, eslint: false, internal: false, prettier: true }),
      ).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: false, internal: false });

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        branch: 'dev',
        dir: expect.any(String),
        messageHeadline: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      // We should only run Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles internal changes only', async () => {
      jest.mocked(Git.getChangedFiles).mockResolvedValue([
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

      expectAutofixCommit({ eslint: false, internal: true });

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        branch: 'dev',
        dir: expect.any(String),
        messageHeadline: 'Run `skuba format`',

        ignore: AUTOFIX_IGNORE_FILES_BASE,
      });

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, Prettier)...
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
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

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
            at Object.<anonymous>..."
      `);
    });

    it('will ignore .npmrc if it has auth secrets', async () => {
      jest.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.npmrc',
          state: 'modified',
        },
      ]);

      jest.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      jest.mocked(Git.currentBranch).mockResolvedValue('dev');
      jest
        .mocked(createDestinationFileReader)
        .mockReturnValue(jest.fn().mockResolvedValue('_authToken'));

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit({ eslint: true, internal: true });

      expect(GitHub.uploadAllFileChanges).toHaveBeenNthCalledWith(1, {
        dir: expect.any(String),
        branch: 'dev',
        messageHeadline: 'Run `skuba format`',

        ignore: [...AUTOFIX_IGNORE_FILES_BASE, ...AUTOFIX_IGNORE_FILES_NPMRC],
      });

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (ESLint, skuba, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });
  });
});
