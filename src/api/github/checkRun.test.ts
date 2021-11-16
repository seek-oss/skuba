import { Octokit } from '@octokit/rest';
import type { Endpoints } from '@octokit/types';
import { mocked } from 'ts-jest/utils';

import type * as GitHub from '../github';

import { createCheckRun } from './checkRun';
import { getHeadSha, getOwnerRepo } from './util';

type CreateCheckRunResponse =
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['response'];

jest.mock('@octokit/rest');
jest.mock('isomorphic-git');
jest.mock('./util');

const mockClient = {
  checks: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

afterEach(() => {
  delete process.env.GITHUB_API_TOKEN;
  delete process.env.GITHUB_TOKEN;
  jest.resetAllMocks();
});

const annotation: GitHub.Annotation = {
  annotation_level: 'failure',
  start_line: 0,
  end_line: 0,
  message:
    "'unused' is defined but never used. Allowed unused args must match /^_/u.",
  path: 'src/skuba.ts',
};

const createResponse = {
  data: {
    id: 3971870754,
  },
} as CreateCheckRunResponse;

describe('createCheckRun', () => {
  const name = 'skuba/lint';
  const summary = 'ESLint, Prettier, Tsc found issues that require triage';
  const annotations = [annotation];
  const conclusion = 'failure';
  const title = 'Build #23 failed';

  beforeEach(() => {
    mocked(Octokit).mockReturnValue(mockClient as unknown as Octokit);
    mocked(getHeadSha).mockResolvedValue(
      'cdd335a418c3dc6804be1c642b19bb63437e2cad',
    );
    mocked(getOwnerRepo).mockResolvedValue({
      owner: 'seek-oss',
      repo: 'skuba',
    });
    mockClient.checks.create.mockReturnValue(createResponse);
  });

  it('should create an Octokit client with the GITHUB_API_TOKEN environment variable', async () => {
    delete process.env.GITHUB_TOKEN;
    process.env.GITHUB_API_TOKEN = 'Hello from GITHUB_API_TOKEN';

    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mocked(Octokit)).toBeCalledWith({
      auth: 'Hello from GITHUB_API_TOKEN',
    });
  });

  it('should create an Octokit client with the GITHUB_TOKEN environment variable', async () => {
    delete process.env.GITHUB_API_TOKEN;
    process.env.GITHUB_TOKEN = 'Hello from GITHUB_TOKEN';

    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mocked(Octokit)).toBeCalledWith({
      auth: 'Hello from GITHUB_TOKEN',
    });
  });

  it('should extract a GitHub owner and repo from Git remotes', async () => {
    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({ owner: 'seek-oss', repo: 'skuba' }),
    );
  });

  it('should use the current Git commit as the `head_sha`', async () => {
    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      }),
    );
  });

  it('should pass the name and conclusion directly to create check run', async () => {
    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({ name, conclusion }),
    );
  });

  it('should suffix a title', async () => {
    const expectedTitle = 'Build #23 passed (1 annotation added)';

    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion: 'success',
      title: 'Build #23 passed',
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        output: {
          title: expectedTitle,
          summary: expect.any(String),
          annotations: expect.any(Array),
        },
      }),
    );
  });

  it('should limit the number of annotations to GITHUB_MAX_ANNOTATIONS in the title', async () => {
    const manyAnnotations: GitHub.Annotation[] = Array.from(
      { length: 51 },
      (_) => annotation,
    );
    const expectedTitle = 'Build #23 failed (50 annotations added)';

    await createCheckRun({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        output: {
          title: expectedTitle,
          summary: expect.any(String),
          annotations: expect.any(Array),
        },
      }),
    );
  });

  it('should leave the summary untouched when the number of annotations < GITHUB_MAX_ANNOTATIONS', async () => {
    await createCheckRun({
      name,
      summary,
      annotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        output: {
          title: expect.any(String),
          summary,
          annotations: expect.any(Array),
        },
      }),
    );
  });

  it('should add a warning to the summary when the number of annotations > GITHUB_MAX_ANNOTATIONS', async () => {
    const manyAnnotations: GitHub.Annotation[] = Array.from(
      { length: 51 },
      (_) => annotation,
    );
    const expectedSummary = `${summary}\n\n51 annotations were provided, but only the first 50 are visible in GitHub.`;

    await createCheckRun({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        output: {
          title: expect.any(String),
          summary: expectedSummary,
          annotations: expect.any(Array),
        },
      }),
    );
  });

  it('should limit the number of annotations to GITHUB_MAX_ANNOTATIONS in the check run', async () => {
    const manyAnnotations: GitHub.Annotation[] = Array.from(
      { length: 51 },
      (_) => annotation,
    );

    await createCheckRun({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
      title,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        output: {
          title: expect.any(String),
          summary: expect.any(String),
          annotations: manyAnnotations.slice(0, 50),
        },
      }),
    );
  });
});
