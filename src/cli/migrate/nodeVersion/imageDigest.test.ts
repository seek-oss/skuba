import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { lookupImageDigest, parseImageReference } from './imageDigest.js';

vi.mock('../../../utils/logging');

const DIGEST = `sha256:${'c'.repeat(64)}`;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal('fetch', fetchMock));

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('parseImageReference', () => {
  it.each([
    [
      'node:26-alpine',
      {
        registry: 'registry-1.docker.io',
        repository: 'library/node',
        tag: '26-alpine',
      },
    ],
    [
      'node',
      {
        registry: 'registry-1.docker.io',
        repository: 'library/node',
        tag: 'latest',
      },
    ],
    [
      'public.ecr.aws/docker/library/node:26',
      {
        registry: 'public.ecr.aws',
        repository: 'docker/library/node',
        tag: '26',
      },
    ],
    [
      'public.ecr.aws/seek-hirer-granite/distroless-node-26:latest',
      {
        registry: 'public.ecr.aws',
        repository: 'seek-hirer-granite/distroless-node-26',
        tag: 'latest',
      },
    ],
    [
      'gcr.io/distroless/nodejs26-debian13',
      {
        registry: 'gcr.io',
        repository: 'distroless/nodejs26-debian13',
        tag: 'latest',
      },
    ],
    [
      'localhost:5000/node:26',
      { registry: 'localhost:5000', repository: 'node', tag: '26' },
    ],
  ])('parses %s', (image, expected) => {
    expect(parseImageReference(image)).toEqual(expected);
  });
});

describe('lookupImageDigest', () => {
  it('returns the digest from an anonymous registry', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { headers: { 'docker-content-digest': DIGEST } }),
    );

    await expect(
      lookupImageDigest('gcr.io/distroless/nodejs26-debian13:nonroot'),
    ).resolves.toBe(DIGEST);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gcr.io/v2/distroless/nodejs26-debian13/manifests/nonroot',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('authenticates with a bearer token challenge', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
          headers: {
            'www-authenticate':
              'Bearer realm="https://auth.docker.io/token",service="registry.docker.io"',
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ token: 'abc' }))
      .mockResolvedValueOnce(
        new Response(null, { headers: { 'docker-content-digest': DIGEST } }),
      );

    await expect(lookupImageDigest('node:26-alpine')).resolves.toBe(DIGEST);

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://auth.docker.io/token?service=registry.docker.io&scope=repository%3Alibrary%2Fnode%3Apull',
    );
    expect(fetchMock.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer abc',
    });
  });

  it('returns undefined when the image does not exist', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(
      lookupImageDigest('gcr.io/distroless/nodejs26-debian12'),
    ).resolves.toBeUndefined();
  });

  it('returns undefined when a token cannot be obtained', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(lookupImageDigest('node:26')).resolves.toBeUndefined();
  });

  it('returns undefined for an invalid digest header', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, { headers: { 'docker-content-digest': 'nope' } }),
    );

    await expect(lookupImageDigest('node:26')).resolves.toBeUndefined();
  });

  it('returns undefined when the registry cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ENOTFOUND'));

    await expect(lookupImageDigest('node:26')).resolves.toBeUndefined();
  });
});
