import { Octokit } from '@octokit/rest';
import { Endpoints } from '@octokit/types';
import { mocked } from 'ts-jest/utils';

import * as GitHub from '../github';

import { createCheckRunFromBuildkite } from './checkRun';

type CreateCheckRunResponse =
  Endpoints['POST /repos/{owner}/{repo}/check-runs']['response'];

jest.mock('@octokit/rest');

const mockClient = {
  checks: {
    create: jest.fn(),
    update: jest.fn(),
  },
};

afterEach(() => {
  delete process.env.BUILDKITE_REPO;
  delete process.env.BUILDKITE_COMMIT;
  delete process.env.BUILDKITE_BUILD_NUMBER;
  delete process.env.GITHUB_API_TOKEN;
  jest.resetAllMocks();
});

const setEnvironmentVariables = () => {
  process.env.BUILDKITE_REPO = 'git@github.com:seek-oss/skuba.git';
  process.env.BUILDKITE_COMMIT = 'cdd335a418c3dc6804be1c642b19bb63437e2cad';
  process.env.BUILDKITE_BUILD_NUMBER = '23';
  process.env.GITHUB_API_TOKEN = 'ghu_someSecretToken';
};

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

describe('createCheckRunFromBuildkite', () => {
  const name = 'skuba/lint';
  const summary = 'ESLint, Prettier, Tsc found issues that require triage';
  const annotations = [annotation];
  const conclusion = 'failure';

  beforeEach(() => {
    mocked(Octokit).mockReturnValue(mockClient as unknown as Octokit);
    mockClient.checks.create.mockReturnValue(createResponse);
    setEnvironmentVariables();
  });

  it('should return immediately if the required environment variables are not set', async () => {
    delete process.env.BUILDKITE_REPO;
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
    });

    expect(mocked(Octokit)).not.toHaveBeenCalled();
  });

  it('should create an Octokit client with an auth token from the GITHUB_API_TOKEN environment variable', async () => {
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
    });

    expect(mocked(Octokit)).toBeCalledWith({
      auth: 'ghu_someSecretToken',
    });
  });

  it('should extract an owner and repo from the BUILDKITE_REPO environment variable', async () => {
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({ owner: 'seek-oss', repo: 'skuba' }),
    );
  });

  it('should use the BUILDKITE_COMMIT environment variable as the `head_sha`', async () => {
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({
        head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      }),
    );
  });

  it('should pass the name and conclusion directly to create check run', async () => {
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
    });

    expect(mockClient.checks.create).toBeCalledWith(
      expect.objectContaining({ name, conclusion }),
    );
  });

  it('should generate a success title', async () => {
    const expectedTitle = 'Build #23 passed (1 annotation added)';

    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion: 'success',
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

  it('should generate a failure title', async () => {
    const expectedTitle = 'Build #23 failed (1 annotation added)';

    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
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

    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
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
    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations,
      conclusion,
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
    const expectedSummary = `${summary}\n\nThere were 51 annotations created. However, the number of annotations displayed has been capped to 50`;

    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
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

    await createCheckRunFromBuildkite({
      name,
      summary,
      annotations: manyAnnotations,
      conclusion,
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
