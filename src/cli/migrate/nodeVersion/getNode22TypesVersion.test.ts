import { getNode22TypesVersion } from './getNode22TypesVersion';

const DEFAULT_NODE_TYPES = '22.9.0';

describe('getNode22TypesVersion', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it.each([
    [
      'should return the default version if the response is not valid JSON',
      () =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
          json: () => Promise.reject(new Error('Invalid JSON')),
        }),
      {
        version: DEFAULT_NODE_TYPES,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return the default version if the response is not ok',
      () =>
        Promise.resolve({
          ok: false,
          statusText: 'Not found',
        }),
      {
        version: DEFAULT_NODE_TYPES,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return default version if fetch fails',
      () => Promise.reject(new Error('Network error')),
      {
        version: DEFAULT_NODE_TYPES,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
    [
      'should return default version if no matching version is found',
      () =>
        Promise.resolve({
          ok: true,
          statusText: 'OK',
          json: () => Promise.resolve({ versions: {} }),
        }),
      {
        version: DEFAULT_NODE_TYPES,
        err: 'Failed to fetch latest version, using fallback version',
      },
    ],
  ])('%s', async (_, mockFetch, expected) => {
    global.fetch = jest.fn(mockFetch) as jest.Mock;

    await expect(
      getNode22TypesVersion(22, DEFAULT_NODE_TYPES),
    ).resolves.toEqual(expected);
  });

  it('should return the latest matching version', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            versions: {
              '22.1.0': {},
              '22.2.0': {},
              '22.3.0': {},
            },
          }),
      }),
    ) as jest.Mock;

    await expect(
      getNode22TypesVersion(22, DEFAULT_NODE_TYPES),
    ).resolves.toEqual({
      version: '22.3.0',
    });
  });
});
