import { Octokit } from '@octokit/rest';
import { GitHub } from 'index';
import { mocked } from 'ts-jest/utils';

import { createBatches } from '../../utils/batch';

import {
  CreateCheckRunParameters,
  CreateCheckRunResponse,
  UpdateCheckRunParameters,
} from './checkRun';

import { createCheckRun, isGitHubAnnotationsEnabled } from '.';

jest.mock('@octokit/rest');
jest.mock('../../utils/batch');

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

describe('isGitHubAnnotationsEnabled', () => {
  it('should return true if all the required environment variables are set', () => {
    setEnvironmentVariables();
    const result = isGitHubAnnotationsEnabled();
    expect(result).toBe(true);
  });

  it('should return false if all the required environment variables are not set', () => {
    const result = isGitHubAnnotationsEnabled();
    expect(result).toBe(false);
  });
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
  const title = 'Build #23 failed (3 annotations added)';
  const summary = 'Eslint, Prettier, Tsc found issues that require triage';
  const annotations = [annotation];
  const conclusion = 'success';

  beforeEach(() => {
    mocked(Octokit).mockReturnValue(mockClient as unknown as Octokit);
    mockClient.checks.create.mockReturnValue(createResponse);
    mocked(createBatches).mockReturnValue([[annotation]]);
    setEnvironmentVariables();
  });

  it('should return immediately if the required environment variables are not set', async () => {
    delete process.env.BUILDKITE_REPO;
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(mocked(Octokit)).not.toHaveBeenCalled();
  });

  it('should create an octokit client with an auth token from an environment variable', async () => {
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(mocked(Octokit)).toBeCalledWith({
      auth: 'ghu_someSecretToken',
    });
  });

  it('should call the createBatches function with the annotations and the github api limit', async () => {
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(createBatches).toBeCalledWith(annotations, 50);
  });

  it('should call the create method on the Octokit client with the correct parameters', async () => {
    await createCheckRun(name, title, summary, annotations, conclusion);

    const expectedParams: CreateCheckRunParameters = {
      owner: 'seek-oss',
      repo: 'skuba',
      name,
      output: {
        title,
        summary,
        annotations: mocked(createBatches).mock.results[0].value[0],
      },
      head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      conclusion,
    };

    expect(mockClient.checks.create).toBeCalledWith(expectedParams);
  });

  it('should call the create method with an empty array when createBatches returns an empty array', async () => {
    mocked(createBatches).mockReturnValue([]);

    await createCheckRun(name, title, summary, annotations, conclusion);

    const expectedParams: CreateCheckRunParameters = {
      owner: 'seek-oss',
      repo: 'skuba',
      name,
      output: {
        title,
        summary,
        annotations: [],
      },
      head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      conclusion,
    };

    expect(mockClient.checks.create).toBeCalledWith(expectedParams);
  });

  it('should call patch on the axios instance if there extra batches on the id returned from Create Check Run', async () => {
    const batchedAnnotation: GitHub.Annotation = {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      message: "TS6133: 'missing' is declared but its value is never read.",
      path: 'src/index.ts',
    };
    mocked(createBatches).mockReturnValue([[annotation], [batchedAnnotation]]);

    const expectedParams: UpdateCheckRunParameters = {
      owner: 'seek-oss',
      repo: 'skuba',
      check_run_id: 3971870754,
      output: {
        title,
        summary,
        annotations: [batchedAnnotation],
      },
    };

    await createCheckRun(name, title, summary, annotations, conclusion);
    expect(mockClient.checks.update).toBeCalledWith(expectedParams);
  });
});
