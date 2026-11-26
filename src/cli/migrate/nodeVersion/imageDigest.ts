import { inspect } from 'util';

import { log } from '../../../utils/logging.js';

const MANIFEST_MEDIA_TYPES = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

const DIGEST_REGEX = /^sha256:[a-f0-9]{64}$/;

const TIMEOUT_MS = 10_000;

type ImageReference = {
  registry: string;
  repository: string;
  tag: string;
};

export const parseImageReference = (image: string): ImageReference => {
  const lastSlash = image.lastIndexOf('/');
  const tagSeparator = image.indexOf(':', lastSlash + 1);

  const name = tagSeparator === -1 ? image : image.slice(0, tagSeparator);
  const tag = tagSeparator === -1 ? 'latest' : image.slice(tagSeparator + 1);

  const [first = '', ...rest] = name.split('/');

  const hasRegistry =
    rest.length > 0 &&
    (first.includes('.') || first.includes(':') || first === 'localhost');

  if (hasRegistry) {
    return { registry: first, repository: rest.join('/'), tag };
  }

  return {
    registry: 'registry-1.docker.io',
    repository: name.includes('/') ? name : `library/${name}`,
    tag,
  };
};

const parseChallenge = (header: string) => {
  const params: Partial<Record<string, string>> = {};

  for (const [, key = '', value = ''] of header.matchAll(/(\w+)="([^"]*)"/g)) {
    params[key] = value;
  }

  return params;
};

const fetchToken = async (
  challenge: string | null,
  repository: string,
): Promise<string | undefined> => {
  if (!challenge?.toLowerCase().startsWith('bearer ')) {
    return;
  }

  const { realm, service } = parseChallenge(challenge);

  if (!realm) {
    return;
  }

  const url = new URL(realm);
  if (service) {
    url.searchParams.set('service', service);
  }
  url.searchParams.set('scope', `repository:${repository}:pull`);

  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    return;
  }

  const body = (await response.json()) as {
    token?: string;
    access_token?: string;
  };

  return body.token ?? body.access_token;
};

/**
 * Looks up the current digest of a container image tag, e.g. `node:26-alpine`.
 *
 * Returns `undefined` if the registry cannot be reached or does not have the
 * image.
 */
export const lookupImageDigest = async (
  image: string,
): Promise<string | undefined> => {
  const { registry, repository, tag } = parseImageReference(image);

  const url = `https://${registry}/v2/${repository}/manifests/${tag}`;

  const head = (token?: string) =>
    fetch(url, {
      method: 'HEAD',
      headers: {
        Accept: MANIFEST_MEDIA_TYPES,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

  try {
    let response = await head();

    if (response.status === 401) {
      const token = await fetchToken(
        response.headers.get('www-authenticate'),
        repository,
      );

      if (!token) {
        return;
      }

      response = await head(token);
    }

    if (!response.ok) {
      return;
    }

    const digest = response.headers.get('docker-content-digest');

    return digest && DIGEST_REGEX.test(digest) ? digest : undefined;
  } catch (err) {
    log.subtle(`Failed to look up digest for ${image}`);
    log.subtle(inspect(err));
    return;
  }
};
