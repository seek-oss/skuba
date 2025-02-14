import npmFetch from 'npm-registry-fetch';

import { getNodeTypesVersion } from './getNodeTypesVersion';

const DEFAULT_VERSION = '22.9.0';

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
        version: DEFAULT_VERSION,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return the default version if the response is not ok',
      () => Promise.reject(new Error('Not found')),
      {
        version: DEFAULT_VERSION,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return default version if fetch fails',
      () => Promise.reject(new Error('Network error')),
      {
        version: DEFAULT_VERSION,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return default version if no matching version is found',
      () =>
        Promise.resolve({
          versions: {},
        }),
      {
        version: DEFAULT_VERSION,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return the latest matching version',
      () =>
        Promise.resolve({
          '22.1.0': {
            name: '@types/node',
            version: '22.1.0',
          },
          '22.3.0': {
            name: '@types/node',
            version: '22.3.0',
          },
          '22.2.0': {
            name: '@types/node',
            version: '22.2.0',
          },
        }),
      {
        version: '22.3.0',
      },
    ],
  ])('%s', async (_, mockFetch, expected) => {
    mockNpmFetch.mockImplementation(mockFetch);

    await expect(getNodeTypesVersion(22, DEFAULT_VERSION)).resolves.toEqual(
      expected,
    );
  });
});
