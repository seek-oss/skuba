import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type {
  Logger,
  TestCollection,
  TestModule,
  TestProject,
  Vitest,
} from 'vitest/node';

import { log } from '../../../../utils/logging.js';

import { GitHubReporter } from './index.js';

import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

vi.mock('@skuba-lib/api/git');
vi.mock('../../../../utils/logging');
vi.mock('@skuba-lib/api/github', async () => ({
  ...(await vi.importActual('@skuba-lib/api/github')),
  createCheckRun: vi.fn(),
}));

const rootProject = { name: '' } as TestProject;

const createCtx = ({ watch = false }: { watch?: boolean } = {}) =>
  ({
    config: { watch },
    logger: {
      formatError: () => ({ output: 'Boom', nearest: undefined }),
    } as Partial<Logger> as Logger,
    getRootProject: () => rootProject,
  }) as Partial<Vitest> as Vitest;

const createTestModule = (projectName: string, ok: boolean) =>
  ({
    moduleId: `${process.cwd()}/src/index.test.ts`,
    project: { name: projectName } as Partial<TestProject> as TestProject,
    errors: () => [],
    ok: () => ok,
    children: {
      allTests: () => [],
    } as unknown as TestCollection,
  }) as Partial<TestModule> as TestModule;

const createReporter = (ctx = createCtx()) => {
  const reporter = new GitHubReporter();
  reporter.onInit(ctx);
  return reporter;
};

beforeEach(() => {
  // Pin every input to `enabledFromEnvironment` and `buildNameFromEnvironment`
  // so that these tests behave the same locally and on each CI provider.
  vi.stubEnv('BUILDKITE', '');
  vi.stubEnv('GITHUB_ACTIONS', '');
  vi.stubEnv('CI', 'true');

  // Takes precedence over an ambient `GITHUB_TOKEN`.
  vi.stubEnv('GITHUB_API_TOKEN', 'Hello from GITHUB_API_TOKEN');

  vi.stubEnv('BUILDKITE_BUILD_NUMBER', '123');

  vi.mocked(Git.findRoot).mockResolvedValue(process.cwd());
});

afterEach(() => {
  vi.unstubAllEnvs();

  vi.resetAllMocks();
});

it('creates a check run per project', async () => {
  await createReporter().onTestRunEnd(
    [createTestModule('unit', true), createTestModule('integration', false)],
    [],
    'failed',
  );

  expect(GitHub.createCheckRun).toHaveBeenCalledTimes(2);
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test (unit)',
    annotations: [],
    conclusion: 'success',
    summary: '`skuba test` passed.',
    title: 'Build #123 passed',
  });
  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test (integration)',
    annotations: [],
    conclusion: 'failure',
    summary: '`skuba test` found issues that require triage.',
    title: 'Build #123 failed',
  });
});

it('creates an unnamed check run when no modules ran', async () => {
  await createReporter().onTestRunEnd([], [], 'passed');

  expect(GitHub.createCheckRun).toHaveBeenCalledWith({
    name: 'skuba/test',
    annotations: [],
    conclusion: 'success',
    summary: '`skuba test` passed.',
    title: 'Build #123 passed',
  });
});

it('returns immediately if GitHub is not enabled', async () => {
  vi.stubEnv('CI', '');

  await createReporter().onTestRunEnd([], [], 'passed');

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
});

it('returns immediately in watch mode', async () => {
  await createReporter(createCtx({ watch: true })).onTestRunEnd(
    [],
    [],
    'passed',
  );

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
});

it('returns immediately on an interrupted run', async () => {
  await createReporter().onTestRunEnd([], [], 'interrupted');

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
});

it('returns immediately if there is no Git repository', async () => {
  vi.mocked(Git.findRoot).mockResolvedValueOnce(null);

  await createReporter().onTestRunEnd([], [], 'passed');

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
  expect(log.warn).toHaveBeenCalledWith(
    'GitHub annotations skipped because no .git directory was found.',
  );
});

it('logs rather than throws if the check run fails', async () => {
  vi.mocked(GitHub.createCheckRun).mockRejectedValueOnce(new Error('Badness!'));

  await expect(
    createReporter().onTestRunEnd([], [], 'passed'),
  ).resolves.toBeUndefined();

  expect(log.warn).toHaveBeenCalledWith(
    'Failed to report test results to GitHub.',
  );
  expect(log.subtle).toHaveBeenCalledWith('Requests:');
});

it('attempts every check run even when one fails', async () => {
  vi.mocked(GitHub.createCheckRun)
    .mockRejectedValueOnce(new Error('Badness!'))
    .mockRejectedValueOnce(new Error('More badness!'));

  await expect(
    createReporter().onTestRunEnd(
      [createTestModule('unit', true), createTestModule('integration', false)],
      [],
      'failed',
    ),
  ).resolves.toBeUndefined();

  expect(GitHub.createCheckRun).toHaveBeenCalledTimes(2);
  expect(log.warn).toHaveBeenCalledWith(
    'Failed to report test results to GitHub.',
  );
});
