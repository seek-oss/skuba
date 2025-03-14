import npmFetch from 'npm-registry-fetch';

import { getNodeTypesVersion } from './getNodeTypesVersion';

const mockNpmFetch = jest.spyOn(npmFetch, 'json');

describe('getNodeTypesVersion', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [
      'should return the default version if the response is not valid JSON',
      () =>
        Promise.resolve({
          invalid: 'response',
        }),
      {
        version: '22.9.0',
        err: 'Failed to fetch latest @types/node version, using fallback version 22.9.0',
      },
    ],
    [
      'should return the default version if the response is not ok',
      () => Promise.reject(new Error('Not found')),
      {
        version: '22.9.0',
        err: 'Failed to fetch latest @types/node version, using fallback version 22.9.0',
      },
    ],
    [
      'should return default version if fetch fails',
      () => Promise.reject(new Error('Network error')),
      {
        version: '22.9.0',
        err: 'Failed to fetch latest @types/node version, using fallback version 22.9.0',
      },
    ],
    [
      'should return default version if no matching version is found',
      () =>
        Promise.resolve({
          versions: {},
        }),
      {
        version: '22.9.0',
        err: 'No matching @types/node versions for Node.js 22',
      },
    ],
    [
      'should return the latest matching version filtering out invalid versions',
      () =>
        Promise.resolve({
          versions: {
            '22.1.0': {
              name: '@types/node',
              version: '22.1.0',
            },
            'not-a-version': {
              name: '@types/node',
              version: 'not-a-version',
            },
            '22.3.0': {
              name: '@types/node',
              version: '22.3.0',
            },
            '22.4.0': {
              name: '@types/node',
              version: '22.4.0',
              deprecated: 'Warning this version is deprecated',
            },
            '22.2.0': {
              name: '@types/node',
              version: '22.2.0',
            },
            '32.2.0': {
              name: '@types/node',
              version: '32.2.0',
            },
          },
        }),
      {
        version: '22.3.0',
      },
    ],
  ])('%s', async (_, mockFetch, expected) => {
    mockNpmFetch.mockImplementation(mockFetch);

    await expect(getNodeTypesVersion(22, '22.9.0')).resolves.toEqual(expected);
  });
});
