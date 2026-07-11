import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { log } from '../../utils/logging.js';

import { createGitHubAnnotations } from './annotate.js';

import * as Git from '@skuba-lib/api/git';
import * as GitHub from '@skuba-lib/api/github';

vi.mock('@skuba-lib/api/git');
vi.mock('../../utils/logging');
vi.mock('@skuba-lib/api/github', async () => ({
  ...(await vi.importActual('@skuba-lib/api/github')),
  createCheckRun: vi.fn(),
}));

beforeEach(() => {
  process.env.CI = 'true';
  process.env.GITHUB_TOKEN = 'Hello from GITHUB_TOKEN';

  vi.mocked(Git.findRoot).mockResolvedValue(process.cwd());
});

afterEach(() => {
  delete process.env.CI;
  delete process.env.GITHUB_TOKEN;

  vi.resetAllMocks();
});

it('creates a test check run in a Git repository', async () => {
  await createGitHubAnnotations(true);

  expect(GitHub.createCheckRun).toHaveBeenCalledOnce();
});

it('returns immediately if there is no Git repository', async () => {
  vi.mocked(Git.findRoot).mockResolvedValueOnce(null);

  await createGitHubAnnotations(true);

  expect(GitHub.createCheckRun).not.toHaveBeenCalled();
  expect(log.warn).toHaveBeenCalledWith(
    'GitHub annotations skipped because no .git directory was found.',
  );
});
