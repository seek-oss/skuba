import { Octokit } from '@octokit/rest';
import { mocked } from 'ts-jest/utils';

import * as Git from '../../api/git';

import { checkIfClean, commitAll, push, pushTags, reset } from './gitUtils';

const mockClient = {
  apps: {
    getAuthenticated: jest.fn(),
  },
};
jest.mock('@octokit/rest');
jest.mock('../../api/git');

const dir = './';

beforeEach(() => {
  mocked(Octokit).mockReturnValue(mockClient as never);
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('push', () => {
  it('should call our Git api push method', async () => {
    await push(dir, 'branch', 'api-token');

    expect(Git.push).toBeCalledWith({
      dir,
      auth: { type: 'gitHubApp', token: 'api-token' },
      ref: 'branch',
      force: undefined,
    });
  });
});

describe('pushTags', () => {
  it('should call Git push for every tag', async () => {
    await pushTags(dir, ['tag1', 'tag2'], 'api-token');

    expect(Git.push).toBeCalledTimes(2);
    expect(Git.push).toBeCalledWith({
      dir,
      auth: { type: 'gitHubApp', token: 'api-token' },
      ref: 'tag1',
      force: undefined,
    });

    expect(Git.push).toBeCalledWith({
      dir,
      auth: { type: 'gitHubApp', token: 'api-token' },
      ref: 'tag2',
      force: undefined,
    });
  });
});

describe('reset', () => {
  it('should call Git reset hard', async () => {
    await reset(dir, 'abcde12345', 'branch');

    expect(Git.reset).toBeCalledWith({
      dir,
      branch: 'branch',
      commitId: 'abcde12345',
      hard: true,
    });
  });
});

describe('commitAll', () => {
  it('should call Git commitAllChanges with a user', async () => {
    mockClient.apps.getAuthenticated.mockReturnValue({
      data: {
        id: 87109344,
        slug: 'buildagencygitapitoken',
        node_id: 'A_kwDOARLrRs4AAjeG',
        owner: {},
        name: 'buildagencygitapitoken',
        description: '',
        external_url: '',
        html_url: 'https://github.com/apps/buildagencygitapitoken',
        created_at: '2021-10-16T02:21:15Z',
        updated_at: '2021-10-16T02:21:15Z',
        permissions: {
          checks: 'write',
          metadata: 'read',
        },
        events: [],
        installations_count: 1,
      },
    });
    await commitAll(dir, 'commit msg', new Octokit());

    expect(Git.commitAllChanges).toBeCalledWith({
      dir,
      message: 'commit msg',
      author: {
        name: 'buildagencygitapitoken[bot]', // user.data.name as string
        email: '87109344+buildagencygitapitoken[bot]@users.noreply.github.com', // `${user.data.id}+${user.data.name}@users.noreply.github.com`
      },
      committer: {
        name: 'buildagencygitapitoken[bot]', // user.data.name as string
        email: '87109344+buildagencygitapitoken[bot]@users.noreply.github.com', // `${user.data.id}+${user.data.name}@users.noreply.github.com`
      },
    });
  });
});

describe('checkIfClean', () => {
  it('should call Git getChangedFiles and return true if it returns an empty array', async () => {
    mocked(Git.getChangedFiles).mockResolvedValue([]);

    const result = await checkIfClean(dir);

    expect(result).toBe(true);
    expect(Git.getChangedFiles).toBeCalledWith({ dir });
  });

  it('should call Git getChangedFiles and return false if it returns files', async () => {
    mocked(Git.getChangedFiles).mockResolvedValue([
      { path: 'index.ts', state: 'added' },
    ]);

    const result = await checkIfClean(dir);

    expect(result).toBe(false);
    expect(Git.getChangedFiles).toBeCalledWith({ dir });
  });
});
