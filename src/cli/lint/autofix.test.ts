import git from 'isomorphic-git';
import memfs, { fs, vol } from 'memfs';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import newGit from '../../../integration/git/new.json' with { type: 'json' };
import { runESLint } from '../adapter/eslint.js';
import { runPrettier } from '../adapter/prettier.js';
import { createDestinationFileReader } from '../configure/analysis/project.js';

import {
  AUTOFIX_IGNORE_FILES_BASE,
  AUTOFIX_IGNORE_FILES_NPMRC,
  RENOVATE_AUTHOR,
  autofix,
} from './autofix.js';
import { internalLint } from './internal.js';

import * as Buildkite from '@skuba-lib/api/buildkite';
import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

vi.mock('fs-extra', () => ({
  ...memfs.fs,
  default: memfs.fs,
}));

vi.mock('simple-git');
vi.mock('@skuba-lib/api/buildkite');
vi.mock('@skuba-lib/api/github');
vi.mock('../adapter/eslint');
vi.mock('../adapter/prettier');
vi.mock('./internal');
vi.mock('../configure/analysis/project');

const MOCK_ERROR = new Error('Badness!');

const stdoutMock = vi.fn();

const stdout = () => {
  const result = stdoutMock.mock.calls
    .flat(1)
    .join('')
    .replace(/(Error: Badness!)[\s\S]+$/, '$1\n...');
  return `\n${result}`;
};

beforeEach(async () => {
  vol.reset();
  vol.fromJSON(newGit, dir);
  await git.branch({ fs, dir, ref: 'feature', checkout: true });

  delete process.env.BUILDKITE_BRANCH;
  delete process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_HEAD_REF;
  delete process.env.GITHUB_REF_NAME;
  delete process.env.GITHUB_REF_PROTECTED;

  process.env.CI = 'true';

  vi.spyOn(console, 'log').mockImplementation((...args) =>
    stdoutMock(`${args.join(' ')}\n`),
  );

  vi.mocked(createDestinationFileReader).mockReturnValue(
    vi.fn().mockResolvedValue(null),
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('autofix', () => {
  const params = {
    debug: false,
    eslint: true,
    prettier: true,
    internal: true,
  };

  describe('GitHub Actions', () => {
    vi.spyOn(Git, 'commitAllChanges');
    vi.spyOn(Git, 'currentBranch');
    vi.spyOn(Git, 'getChangedFiles');
    vi.spyOn(Git, 'getHeadCommitMessage');
    const push = vi.spyOn(Git, 'push');

    const expectAutofixCommit = (
      { eslint, internal }: Record<'eslint' | 'internal', boolean> = {
        eslint: true,
        internal: true,
      },
    ) => {
      expect(runESLint).toHaveBeenCalledTimes(internal || eslint ? 1 : 0);
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
      vi.mocked(simpleGit).mockReturnValue({ push } as any);
      push.mockResolvedValue({ ok: true, error: null, refs: {} });
    });

    it('bails on a non-CI environment', async () => {
      delete process.env.CI;
      delete process.env.GITHUB_ACTIONS;

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails when there is no Git repository', async () => {
      vol.reset();

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
      expect(stdout()).toContain(
        'Autofix skipped because no .git directory was found.',
      );
    });

    it('bails on the master branch', async () => {
      await git.branch({ fs, dir, ref: 'master', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the main branch', async () => {
      await git.branch({ fs, dir, ref: 'main', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the Buildkite default branch', async () => {
      process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH = 'devel';
      await git.branch({ fs, dir, ref: 'devel', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on a renovate branch when there is no open pull request', async () => {
      await git.branch({ fs, dir, ref: 'renovate-skuba-7.x', checkout: true });
      vi.mocked(GitHub.getPullRequestNumber).mockRejectedValue(
        new Error(
          `Commit cdd1520 is not associated with an open GitHub pull request`,
        ),
      );

      await expect(autofix(params)).resolves.toBeUndefined();

      expect(Buildkite.annotate).toHaveBeenCalled();

      expectNoAutofix();
    });

    it('suceeds on a renovate branch when there is an open pull request associated with the commit', async () => {
      await git.branch({ fs, dir, ref: 'renovate-skuba-7.x', checkout: true });
      vi.mocked(GitHub.getPullRequestNumber).mockResolvedValue(6);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
    });

    it('bails on a GitHub protected branch', async () => {
      process.env.GITHUB_REF_PROTECTED = 'true';

      await git.branch({ fs, dir, ref: 'beta', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on an autofix head commit', async () => {
      await git.branch({ fs, dir, ref: 'feature', checkout: true });
      await git.commit({ fs, dir, message: 'Run `skuba format`' });

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
      vi.mocked(Git.commitAllChanges).mockResolvedValue(undefined);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        No autofixes detected.
        "
      `);
    });

    it('uses Git CLI in GitHub Actions', async () => {
      process.env.GITHUB_ACTIONS = 'true';

      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from ESLint only', async () => {
      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

      await expect(
        autofix({ ...params, eslint: true, prettier: false }),
      ).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(push).toHaveBeenNthCalledWith(1);

      // We should run both ESLint and Prettier
      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

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
      vi.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.gitignore',
          state: 'modified',
        },
      ]);

      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('tolerates guard errors', async () => {
      const ERROR = new Error('badness!');

      vi.mocked(Git.currentBranch).mockRejectedValue(ERROR);
      vi.mocked(Git.getHeadCommitMessage).mockRejectedValue(ERROR);

      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).toHaveBeenNthCalledWith(1);

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('bails on commit error', async () => {
      vi.mocked(Git.commitAllChanges).mockRejectedValue(MOCK_ERROR);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
        ..."
      `);
    });

    it('will ignore .npmrc if it has auth secrets', async () => {
      vi.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.npmrc',
          state: 'modified',
        },
      ]);

      vi.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });
      vi.mocked(createDestinationFileReader).mockReturnValue(
        vi.fn().mockResolvedValue('_authToken'),
      );

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
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
      expect(runESLint).toHaveBeenCalledTimes(internal || eslint ? 1 : 0);
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

    it('bails when there is no Git repository', async () => {
      vol.reset();

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
      expect(stdout()).toContain(
        'Autofix skipped because no .git directory was found.',
      );
    });

    it('bails on the master branch', async () => {
      await git.branch({ fs, dir, ref: 'master', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the main branch', async () => {
      await git.branch({ fs, dir, ref: 'main', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on the Buildkite default branch', async () => {
      process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH = 'devel';

      await git.branch({ fs, dir, ref: 'devel', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on a GitHub protected branch', async () => {
      process.env.GITHUB_REF_PROTECTED = 'true';

      await git.branch({ fs, dir, ref: 'beta', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on an autofix head commit', async () => {
      await git.branch({ fs, dir, ref: 'feature', checkout: true });
      await git.commit({ fs, dir, message: 'Run `skuba format`' });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('bails on no fixable issues', async () => {
      await git.branch({ fs, dir, ref: 'feature', checkout: true });

      await expect(
        autofix({ ...params, eslint: false, prettier: false, internal: false }),
      ).resolves.toBeUndefined();

      expectNoAutofix();
    });

    it('skips push when there are no changes', async () => {
      await git.branch({ fs, dir, ref: 'feature', checkout: true });

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        No autofixes detected.
        "
      `);
    });

    it('handles fixable issues from ESLint only', async () => {
      vi.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('handles fixable issues from Prettier only', async () => {
      vi.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

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
      vi.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.gitignore',
          state: 'modified',
        },
      ]);

      vi.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });

    it('logs a warning when the current branch cannot be determined', async () => {
      vi.mocked(Git.currentBranch).mockResolvedValue(undefined);

      vi.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');

      await expect(autofix(params)).resolves.toBeUndefined();

      expect(GitHub.uploadAllFileChanges).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Could not determine the current branch.
        Please propagate BUILDKITE_BRANCH, GITHUB_HEAD_REF, GITHUB_REF_NAME, or the .git directory to your container.
        "
      `);
    });

    it('bails on commit error', async () => {
      await git.branch({ fs, dir, ref: 'dev', checkout: true });

      vi.mocked(GitHub.uploadAllFileChanges).mockRejectedValue(MOCK_ERROR);

      await expect(autofix(params)).resolves.toBeUndefined();

      expectAutofixCommit();
      expect(Git.push).not.toHaveBeenCalled();

      expect(stdout()).toMatchInlineSnapshot(`
        "

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Failed to push fix commit.
        Does your CI environment have write access to your Git repository?
        Error: Badness!
        ..."
      `);
    });

    it('will ignore .npmrc if it has auth secrets', async () => {
      vi.mocked(Git.getChangedFiles).mockResolvedValue([
        {
          path: '.npmrc',
          state: 'modified',
        },
      ]);

      vi.mocked(GitHub.uploadAllFileChanges).mockResolvedValue('commit-sha');
      await git.branch({ fs, dir, ref: 'dev', checkout: true });
      vi.mocked(createDestinationFileReader).mockReturnValue(
        vi.fn().mockResolvedValue('_authToken'),
      );

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

        Attempting to autofix issues (skuba, ESLint, Prettier)...
        Pushed fix commit commit-sha.
        "
      `);
    });
  });
});

const dir = process.cwd();
const author = { name: 'user', email: 'user@email.com' };

const params = {
  debug: false,
  eslint: true,
  prettier: true,
  internal: true,
};

const writeAndCommit = async ({
  files,
  commitAuthor = author,
}: {
  files: Record<string, string>;
  commitAuthor?: { name: string; email: string };
}) => {
  for (const [filepath, contents] of Object.entries(files)) {
    const directory = filepath.split('/').slice(0, -1).join('/');
    if (directory) {
      await fs.promises.mkdir(directory, { recursive: true });
    }
    await fs.promises.writeFile(filepath, contents);
  }

  await git.add({ fs, dir, filepath: Object.keys(files) });
  await git.commit({
    fs,
    dir,
    author: commitAuthor,
    message: 'commit',
  });
};

const createRenovateLockfileHead = async (
  lockfilePath: string,
  files: Record<string, string> = {},
) => {
  await writeAndCommit({
    files: { '.gitignore': 'node_modules\n' },
    commitAuthor: author,
  });

  await writeAndCommit({
    files: { ...files, [lockfilePath]: 'base lockfile' },
    commitAuthor: RENOVATE_AUTHOR,
  });
};

const assertGitStatus = async (filepath: string, expected: string) => {
  const status = await git.status({ fs, dir, filepath });
  expect(status).toBe(expected);
};

describe('Renovate autofix guard', () => {
  let push: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.GITHUB_ACTIONS = 'true';
    process.env.GITHUB_HEAD_REF = 'renovate/skuba-0.x-lockfile';

    push = vi.fn().mockResolvedValue(undefined);
    vi.mocked(simpleGit).mockReturnValue({ push } as any);
  });

  it('discards lockfile-only changes on Renovate lock file update per Git history', async () => {
    await createRenovateLockfileHead('pnpm-lock.yaml');

    await fs.promises.writeFile('pnpm-lock.yaml', 'updated lockfile');

    await expect(autofix(params)).resolves.toBeUndefined();

    expect(push).not.toHaveBeenCalled();
    await assertGitStatus('pnpm-lock.yaml', '*modified');

    expect(stdout()).toContain(
      'Renovate appears to be performing lock file updates on this branch.',
    );
    expect(stdout()).toContain('No autofixes detected.');
  });

  it.each(['renovate-package-16.x-lockfile', 'renovate/skuba-0.x-lockfile'])(
    'discards lockfile-only changes on Renovate lock file update per %s branch name fallback',
    async (branchName) => {
      process.env.GITHUB_HEAD_REF = branchName;

      await fs.promises.writeFile('pnpm-lock.yaml', 'updated lockfile');

      vi.spyOn(git, 'log').mockRejectedValueOnce(new Error('Git error'));

      await expect(autofix(params)).resolves.toBeUndefined();

      expect(push).not.toHaveBeenCalled();
      await assertGitStatus('pnpm-lock.yaml', '*added');

      expect(stdout()).toContain(
        'Renovate autofix guard failed to inspect head commit, falling back to branch name match.',
      );
      expect(stdout()).toContain(
        'Renovate appears to be performing lock file updates on this branch.',
      );
      expect(stdout()).toContain('No autofixes detected.');
    },
  );

  it('pushes lockfile changes on Renovate package.json update', async () => {
    process.env.GITHUB_ACTIONS = 'true';

    await createRenovateLockfileHead('pnpm-lock.yaml', {
      'package.json': '{"name":"example"}',
    });

    await Promise.all([
      fs.promises.writeFile('pnpm-lock.yaml', 'updated lockfile'),
      fs.promises.writeFile('package.json', '{"name":"example2"}'),
    ]);

    await expect(autofix(params)).resolves.toBeUndefined();

    expect(Git.commitAllChanges).toHaveBeenCalledWith({
      dir: expect.any(String),
      ignore: [
        {
          path: 'Dockerfile-incunabulum',
          state: 'added',
        },
      ],
      message: 'Run `skuba format`',
    });
    expect(push).toHaveBeenCalledTimes(1);
    await assertGitStatus('package.json', 'unmodified');
    await assertGitStatus('pnpm-lock.yaml', 'unmodified');

    expect(stdout()).toContain('Pushed fix commit');
  });

  it('pushes non-lockfile changes on Renovate lock file update', async () => {
    process.env.GITHUB_ACTIONS = 'true';

    await createRenovateLockfileHead('pnpm-lock.yaml');

    await Promise.all([
      fs.promises.writeFile('pnpm-lock.yaml', 'updated lockfile'),
      fs.promises.writeFile('package.json', '{"name":"example"}'),
    ]);

    await expect(autofix(params)).resolves.toBeUndefined();

    expect(Git.commitAllChanges).toHaveBeenCalledWith({
      dir: expect.any(String),
      ignore: [
        {
          path: 'Dockerfile-incunabulum',
          state: 'added',
        },
        {
          path: 'pnpm-lock.yaml',
          state: 'modified',
        },
      ],
      message: 'Run `skuba format`',
    });
    expect(push).toHaveBeenCalledTimes(1);
    await assertGitStatus('package.json', 'unmodified');
    await assertGitStatus('pnpm-lock.yaml', '*modified');

    expect(stdout()).toContain('Pushed fix commit');
  });

  it('discards Yarn lockfile-only changes', async () => {
    process.env.GITHUB_HEAD_REF = 'renovate/yarn-lockfile';

    await createRenovateLockfileHead('yarn.lock');

    await fs.promises.writeFile('yarn.lock', 'updated lockfile');

    await expect(autofix(params)).resolves.toBeUndefined();

    expect(push).not.toHaveBeenCalled();
    await assertGitStatus('yarn.lock', '*modified');

    expect(stdout()).toContain(
      'Renovate appears to be performing lock file updates on this branch.',
    );
    expect(stdout()).toContain('No autofixes detected.');
  });
});
