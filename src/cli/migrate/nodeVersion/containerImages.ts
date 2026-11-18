import { join } from 'path';

import fs from 'fs-extra';
import { coerce, lt } from 'semver';

import { globFiles } from '../../../utils/glob.js';
import { log } from '../../../utils/logging.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';

import { lookupImageDigest } from './imageDigest.js';

const CONTAINER_IMAGE_FILES = [
  '**/Dockerfile*',
  '**/dockerfile*',
  '**/*.Dockerfile',
  '**/*.dockerfile',
  '**/docker-compose*.y*ml',
  '**/.buildkite/*',
];

/**
 * Matches the start of a Dockerfile `FROM` instruction or a YAML `image` key.
 */
const PREFIX = String.raw`^(?<prefix>FROM.* |\s*(?:-\s+)?image:\s+["']?)`;

/**
 * Matches the rest of the line after an image reference, such as a closing
 * quote, a stage name or a comment.
 */
const SUFFIX = String.raw`(?<suffix>["']?(?: .*)?)$`;

const DIGEST = String.raw`(?<digest>@sha256:[a-f0-9]{64})?`;

type Groups = Partial<Record<string, string>>;

type ImagePattern = {
  regex: () => RegExp;
  /**
   * Builds the upgraded image reference without a digest.
   */
  image: (groups: Groups, nodeVersion: string) => string;
};

const IMAGE_PATTERNS: ImagePattern[] = [
  {
    regex: () =>
      new RegExp(
        String.raw`${PREFIX}(?<registry>public\.ecr\.aws\/docker\/library\/)?node:(?<version>[0-9]+(?:\.[0-9]+(?:\.[0-9]+)?)?)(?<variant>-[a-z0-9][a-z0-9.-]*)?${DIGEST}${SUFFIX}`,
        'gm',
      ),
    image: ({ registry = '', variant = '' }, nodeVersion) =>
      `${registry}node:${nodeVersion}${variant}`,
  },
  {
    regex: () =>
      new RegExp(
        String.raw`${PREFIX}gcr\.io\/distroless\/nodejs(?<version>\d+)-debian(?<debian>\d+)(?<tag>:[\w][\w.-]*)?${DIGEST}${SUFFIX}`,
        'gm',
      ),
    image: ({ debian = '', tag = '' }, nodeVersion) =>
      `gcr.io/distroless/nodejs${nodeVersion}-debian${debian}${tag}`,
  },
  {
    // Hirer golden images. Their tags are specific to each image, so upgraded
    // images are pointed to `latest`.
    regex: () =>
      new RegExp(
        String.raw`(?<registry>public\.ecr\.aws\/(?:seek-hirer-granite|i3c7m4r8)\/)(?<distroless>distroless-)?node-(?<version>\d+)(?<variant>-alpine)?(?::[\w][\w.-]*)?${DIGEST}`,
        'g',
      ),
    image: ({ registry = '', distroless = '', variant = '' }, nodeVersion) =>
      `${registry}${distroless}node-${nodeVersion}${variant}:latest`,
  },
];

const isOlder = (version: string, nodeVersion: string) => {
  const current = coerce(version);
  const target = coerce(nodeVersion);

  return Boolean(current && target && lt(current, target));
};

const replaceAsync = async (
  contents: string,
  regex: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>,
) => {
  const matches = [...contents.matchAll(regex)];

  const replacements = await Promise.all(matches.map(replacer));

  let result = '';
  let lastIndex = 0;

  matches.forEach((match, index) => {
    result += contents.slice(lastIndex, match.index) + replacements[index];
    lastIndex = match.index + match[0].length;
  });

  return result + contents.slice(lastIndex);
};

/**
 * Upgrades Node.js container images in Dockerfiles, Docker Compose files and
 * Buildkite pipelines.
 *
 * Images pinned to a digest are re-pinned to the current digest of the
 * upgraded image. If the digest cannot be looked up, it is removed.
 */
export const upgradeContainerImages = async (
  dir: string,
  nodeVersion: string,
) => {
  const readFile = createDestinationFileReader(dir);
  const paths = new Set(
    await globFiles(CONTAINER_IMAGE_FILES, {
      cwd: dir,
      exclude: ['**/node_modules/**'],
    }),
  );

  const digests = new Map<string, Promise<string | undefined>>();

  const resolveDigest = (image: string) => {
    let digest = digests.get(image);
    if (!digest) {
      digest = lookupImageDigest(image);
      digests.set(image, digest);
    }
    return digest;
  };

  await Promise.all(
    [...paths].map(async (filePath) => {
      const contents = await readFile(filePath);
      if (!contents) {
        return;
      }

      let patched = contents;

      for (const pattern of IMAGE_PATTERNS) {
        patched = await replaceAsync(
          patched,
          pattern.regex(),
          async (match) => {
            const groups: Groups = match.groups ?? {};
            const { prefix = '', version, digest, suffix = '' } = groups;

            if (!version || !isOlder(version, nodeVersion)) {
              return match[0];
            }

            const image = pattern.image(groups, nodeVersion);

            if (!digest) {
              return `${prefix}${image}${suffix}`;
            }

            const newDigest = await resolveDigest(image);

            if (!newDigest) {
              log.warn(
                `Unable to look up the digest for ${image}; removing the digest in ${filePath}`,
              );
              return `${prefix}${image}${suffix}`;
            }

            return `${prefix}${image}@${newDigest}${suffix}`;
          },
        );
      }

      if (patched !== contents) {
        await fs.promises.writeFile(join(dir, filePath), patched);
      }
    }),
  );
};
