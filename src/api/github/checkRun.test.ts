import axios, { AxiosInstance } from 'axios';
import { Github } from 'index';
import { mocked } from 'ts-jest/utils';

import { createBatches } from '../../utils/batch';

import {
  CreateCheckRunParameters,
  CreateCheckRunResponse,
  UpdateCheckRunParameters,
} from './checkRun';

import { createCheckRun, isGithubAnnotationsEnabled } from '.';

jest.mock('axios');
jest.mock('../../utils/batch');

const mockAxiosInstance = {
  post: jest.fn(),
  patch: jest.fn(),
} as Partial<AxiosInstance> as AxiosInstance;

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

describe('isGithubAnnotationsEnabled', () => {
  it('should return true if all the required environment variables are set', () => {
    setEnvironmentVariables();
    const result = isGithubAnnotationsEnabled();
    expect(result).toBe(true);
  });

  it('should return false if all the required environment variables are not set', () => {
    const result = isGithubAnnotationsEnabled();
    expect(result).toBe(false);
  });
});

const annotation: Github.Annotation = {
  annotation_level: 'failure',
  start_line: 0,
  end_line: 0,
  message:
    "'unused' is defined but never used. Allowed unused args must match /^_/u.",
  path: 'src/skuba.ts',
};

const createResponse = {
  id: 3971870754,
} as CreateCheckRunResponse;

describe('createCheckRun', () => {
  const name = 'skuba/lint';
  const title = 'Build #23 failed (3 annotations added)';
  const summary = 'Eslint, Prettier, Tsc found issues that require triage';
  const annotations = [annotation];
  const conclusion = 'success';

  beforeEach(() => {
    mocked(axios.create).mockReturnValue(mockAxiosInstance);
    mocked(createBatches).mockReturnValue([[annotation]]);
    mocked(mockAxiosInstance.post).mockResolvedValue({
      data: createResponse,
    });
    setEnvironmentVariables();
  });

  it('should return immediately if the required environment variables are not set', async () => {
    delete process.env.BUILDKITE_REPO;
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(axios.create).not.toHaveBeenCalled();
  });

  it('should create an axios client with a baseURL and headers formed from environment variables', async () => {
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(axios.create).toBeCalledWith({
      baseURL: 'https://api.github.com/repos/seek-oss/skuba/check-runs',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: 'token ghu_someSecretToken',
      },
    });
  });

  it('should call the createBatches function with the annotations and the github api limit', async () => {
    await createCheckRun(name, title, summary, annotations, conclusion);

    expect(createBatches).toBeCalledWith(annotations, 50);
  });

  it('should call post on the axios instance with the correct CreateCheckRun parameters', async () => {
    const expectedPath = '/';

    await createCheckRun(name, title, summary, annotations, conclusion);

    const expectedParams: CreateCheckRunParameters = {
      name,
      output: {
        title,
        summary,
        annotations: mocked(createBatches).mock.results[0].value[0],
      },
      head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      conclusion,
    };

    expect(mockAxiosInstance.post).toBeCalledWith(expectedPath, {
      data: expectedParams,
    });
  });

  it('should call post on the axios instance with an empty array if createBatches returns an empty array', async () => {
    mocked(createBatches).mockReturnValue([]);

    const expectedPath = '/';

    await createCheckRun(name, title, summary, annotations, conclusion);

    const expectedParams: CreateCheckRunParameters = {
      name,
      output: {
        title,
        summary,
        annotations: [],
      },
      head_sha: 'cdd335a418c3dc6804be1c642b19bb63437e2cad',
      conclusion,
    };

    expect(mockAxiosInstance.post).toBeCalledWith(expectedPath, {
      data: expectedParams,
    });
  });

  it('should call patch on the axios instance if there extra batches on the id returned from Create Check Run', async () => {
    const batchedAnnotation: Github.Annotation = {
      annotation_level: 'failure',
      start_line: 1,
      end_line: 1,
      message: "TS6133: 'missing' is declared but its value is never read.",
      path: 'src/index.ts',
    };
    mocked(createBatches).mockReturnValue([[annotation], [batchedAnnotation]]);

    const expectedPath = `/${createResponse.id}`;

    const expectedParams: UpdateCheckRunParameters = {
      output: {
        title,
        summary,
        annotations: [batchedAnnotation],
      },
    };

    await createCheckRun(name, title, summary, annotations, conclusion);
    expect(mockAxiosInstance.patch).toBeCalledWith(expectedPath, {
      data: expectedParams,
    });
  });
});
