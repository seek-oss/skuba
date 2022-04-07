import path from 'path';

import simpleGit from 'simple-git';

import * as Git from '../../api/git';
import { runESLint } from '../../cli/adapter/eslint';
import { runPrettier } from '../../cli/adapter/prettier';

import { autofix } from './autofix';

jest.mock('simple-git');
jest.mock('../../api/git');
jest.mock('../../cli/adapter/eslint');
jest.mock('../../cli/adapter/prettier');

const MOCK_ERROR = new Error('Badness!');

const rootDir = path.join(__dirname, '..', '..', '..');

const stdoutMock = jest.fn();

const stdout = () => {
  const result = stdoutMock.mock.calls
    .flat(1)
    .map((line) => line.replaceAll(rootDir, '<rootDir>'))
    .join('');
  return `\n${result}`;
};

const expectAutofixCommit = () => {
  expect(runESLint).toHaveBeenCalledTimes(1);
  expect(runPrettier).toHaveBeenCalledTimes(1);
  expect(Git.commitAllChanges).toHaveBeenCalledTimes(1);
};

const expectNoAutofix = () => {
  expect(runESLint).not.toHaveBeenCalled();
  expect(runPrettier).not.toHaveBeenCalled();
  expect(Git.commitAllChanges).not.toHaveBeenCalled();
  expect(Git.push).not.toHaveBeenCalled();
};

beforeEach(() => {
  delete process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH;
  delete process.env.GITHUB_ACTIONS;
  delete process.env.GITHUB_REF_PROTECTED;

  process.env.CI = 'true';

  jest
    .spyOn(console, 'log')
    .mockImplementation((...args) => stdoutMock(`${args.join(' ')}\n`));
});

afterEach(jest.resetAllMocks);

describe('autofix', () => {
  it('bails on a non-CI environment', async () => {
    delete process.env.CI;

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('bails on the master branch', async () => {
    jest.mocked(Git.currentBranch).mockResolvedValue('master');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('bails on the main branch', async () => {
    jest.mocked(Git.currentBranch).mockResolvedValue('main');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('bails on the Buildkite default branch', async () => {
    process.env.BUILDKITE_PIPELINE_DEFAULT_BRANCH = 'devel';

    jest.mocked(Git.currentBranch).mockResolvedValue('devel');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('bails on a GitHub protected branch', async () => {
    process.env.GITHUB_REF_PROTECTED = 'true';

    jest.mocked(Git.currentBranch).mockResolvedValue('beta');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('bails on an autofix head commit', async () => {
    jest.mocked(Git.currentBranch).mockResolvedValue('feature');
    jest
      .mocked(Git.getHeadCommitMessage)
      .mockResolvedValue('Run `skuba format`');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectNoAutofix();
  });

  it('skips push on empty commit', async () => {
    jest.mocked(Git.commitAllChanges).mockResolvedValue(undefined);

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();
    expect(Git.push).not.toHaveBeenCalled();

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      No autofixes detected.
      "
    `);
  });

  it('uses Git CLI in GitHub Actions', async () => {
    process.env.GITHUB_ACTIONS = 'true';

    const push = jest.fn();
    jest.mocked(simpleGit).mockReturnValue({ push } as any);

    jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();

    expect(Git.push).not.toHaveBeenCalled();
    expect(push).toHaveBeenNthCalledWith(1);

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      Pushed fix commit commit-sha.
      "
    `);
  });

  it('uses isomorphic-git in other CI environments', async () => {
    jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
    jest.mocked(Git.currentBranch).mockResolvedValue('dev');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();
    expect(Git.push).toHaveBeenNthCalledWith(1, {
      auth: { type: 'gitHubApp' },
      dir: expect.any(String),
      ref: 'commit-sha',
      remoteRef: 'dev',
    });

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      Pushed fix commit commit-sha.
      "
    `);
  });

  it('tolerates guard errors', async () => {
    const ERROR = new Error('badness!');

    jest.mocked(Git.currentBranch).mockRejectedValue(ERROR);
    jest.mocked(Git.getHeadCommitMessage).mockRejectedValue(ERROR);

    jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();
    expect(Git.push).toHaveBeenNthCalledWith(1, {
      auth: { type: 'gitHubApp' },
      dir: expect.any(String),
      ref: 'commit-sha',
    });

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      Pushed fix commit commit-sha.
      "
    `);
  });

  it('bails on commit error', async () => {
    jest.mocked(Git.commitAllChanges).mockRejectedValue(MOCK_ERROR);

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();
    expect(Git.push).not.toHaveBeenCalled();

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      Failed to push fix commit.
      Does your CI environment have write access to your Git repository?
      Error: Badness!
          at Object.<anonymous> (<rootDir>/src/cli/lint/autofix.test.ts:16:20)
          at Runtime._execModule (<rootDir>/node_modules/jest-runtime/build/index.js:1646:24)
          at Runtime._loadModule (<rootDir>/node_modules/jest-runtime/build/index.js:1185:12)
          at Runtime.requireModule (<rootDir>/node_modules/jest-runtime/build/index.js:1009:12)
          at jestAdapter (<rootDir>/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:13)
          at processTicksAndRejections (node:internal/process/task_queues:96:5)
          at runTestInternal (<rootDir>/node_modules/jest-runner/build/runTest.js:389:16)
          at runTest (<rootDir>/node_modules/jest-runner/build/runTest.js:475:34)
          at TestRunner.runTests (<rootDir>/node_modules/jest-runner/build/index.js:101:12)
          at TestScheduler.scheduleTests (<rootDir>/node_modules/@jest/core/build/TestScheduler.js:333:13)
      "
    `);
  });

  it('bails on push error', async () => {
    jest.mocked(Git.commitAllChanges).mockResolvedValue('commit-sha');
    jest.mocked(Git.push).mockRejectedValue(MOCK_ERROR);

    await expect(autofix({ debug: false })).resolves.toBeUndefined();

    expectAutofixCommit();
    expect(Git.push).toHaveBeenNthCalledWith(1, {
      auth: { type: 'gitHubApp' },
      dir: expect.any(String),
      ref: 'commit-sha',
    });

    expect(stdout()).toMatchInlineSnapshot(`
      "

      Trying to autofix with ESLint and Prettier...
      Failed to push fix commit.
      Does your CI environment have write access to your Git repository?
      Error: Badness!
          at Object.<anonymous> (<rootDir>/src/cli/lint/autofix.test.ts:16:20)
          at Runtime._execModule (<rootDir>/node_modules/jest-runtime/build/index.js:1646:24)
          at Runtime._loadModule (<rootDir>/node_modules/jest-runtime/build/index.js:1185:12)
          at Runtime.requireModule (<rootDir>/node_modules/jest-runtime/build/index.js:1009:12)
          at jestAdapter (<rootDir>/node_modules/jest-circus/build/legacy-code-todo-rewrite/jestAdapter.js:79:13)
          at processTicksAndRejections (node:internal/process/task_queues:96:5)
          at runTestInternal (<rootDir>/node_modules/jest-runner/build/runTest.js:389:16)
          at runTest (<rootDir>/node_modules/jest-runner/build/runTest.js:475:34)
          at TestRunner.runTests (<rootDir>/node_modules/jest-runner/build/index.js:101:12)
          at TestScheduler.scheduleTests (<rootDir>/node_modules/@jest/core/build/TestScheduler.js:333:13)
      "
    `);
  });
});
