import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging';
import { createDestinationFileReader } from '../../configure/analysis/project';

type SubPatch = (
  | { files: string; file?: never }
  | { file: string; files?: never }
) & {
  test?: RegExp;
  replace: string;
};

type VersionResult = {
  version: string;
  err: string | undefined;
};

type RegistryResponse = {
  'dist-tags': Record<string, string>;
};

export const getLatestNode22Types = async (): Promise<VersionResult> => {
  const FALLBACK_VERSION = '22.9.0';
  const url = 'https://registry.npmjs.org/@types/node';
  const headers = {
    accept:
      'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*',
  };

  try {
    const fetchResponse = await fetch(url, { headers });
    const jsonResponse = (await fetchResponse.json()) as RegistryResponse;
    const latestNode22 = jsonResponse['dist-tags'].node22;

    return { version: latestNode22 ?? FALLBACK_VERSION, err: undefined };
  } catch {
    return {
      version: FALLBACK_VERSION,
      err: 'Failed to fetch latest version, using fallback version',
    };
  }
};

const SHA_REGEX = /(?<=node.*)(@sha256:[a-f0-9]{64})/gm;

const subPatches: SubPatch[] = [
  { file: '.nvmrc', replace: '<%- version %>\n' },
  {
    files: 'Dockerfile*',
    test: /^FROM(.*) (public.ecr.aws\/docker\/library\/)?node:[0-9.]+(@sha256:[a-f0-9]{64})?(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: 'FROM$1 $2node:<%- version %>$3$5$6',
  },
  {
    files: 'Dockerfile*',
    test: /^FROM(.*) gcr.io\/distroless\/nodejs\d+-debian(.+)$/gm,
    replace: 'FROM$1 gcr.io/distroless/nodejs<%- version %>-debian$2',
  },
  {
    files: 'serverless*.y*ml',
    test: /nodejs\d+.x/gm,
    replace: 'nodejs<%- version %>.x',
  },
  {
    files: 'infra/**/*.ts',
    test: /NODEJS_\d+_X/g,
    replace: 'NODEJS_<%- version %>_X',
  },
  {
    files: '**/.buildkite/*',
    test: /image: (public.ecr.aws\/docker\/library\/)?node:[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: 'image: $1node:<%- version %>$3',
  },
  {
    files: '.node-version*',
    test: /(v)?\d+\.\d+\.\d+(.+)?/gm,
    replace: '$1<%- version %>$2',
  },
  {
    files: '**/package.json',
    test: /"@types\/node": "(\^)?[0-9.]+"/gm,
    replace: '"@types/node": "$1<%- version %>"',
  },
  {
    files: '**/package.json',
    test: /("engines":\s*{[^}]*"node":\s*">=)(\d+)("[^}]*})(?![^}]*"skuba":\s*{[^}]*"type":\s*"package")/gm,
    replace: '$1<%- version %>$3',
  },
  {
    files: '**/tsconfig.json',
    test: /("target":\s*")(ES?:[0-9]+|Next|[A-Za-z]+[0-9]*)"/gim,
    replace: '$1<%- version %>"',
  },
  {
    files: '**/docker-compose*.y*ml',
    test: /image: (public.ecr.aws\/docker\/library\/)?node:[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: 'image: $1node:<%- version %>$3',
  },
];

const removeNodeShas = (content: string): string =>
  content.replace(SHA_REGEX, '');

type Versions = {
  nodeVersion: number;
  nodeTypesVersion: string;
};

const runSubPatch = async (
  { nodeVersion, nodeTypesVersion }: Versions,
  dir: string,
  patch: SubPatch,
) => {
  const readFile = createDestinationFileReader(dir);
  const paths = patch.file
    ? [patch.file]
    : await glob(patch.files ?? [], { cwd: dir });

  await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(path);
      if (!contents) {
        return;
      }

      if (patch.test && !patch.test.test(contents)) {
        return;
      }

      const unPinnedContents = removeNodeShas(contents);

      let templated: string;
      if (
        path.includes('package.json') &&
        patch.replace.includes('@types/node')
      ) {
        templated = patch.replace.replaceAll(
          '<%- version %>',
          nodeTypesVersion,
        );
      } else if (path.includes('tsconfig.json')) {
        templated = patch.replace.replaceAll('<%- version %>', 'ES2024');
      } else {
        templated = patch.replace.replaceAll(
          '<%- version %>',
          nodeVersion.toString(),
        );
      }

      await fs.promises.writeFile(
        path,
        patch.test
          ? unPinnedContents.replaceAll(patch.test, templated)
          : templated,
      );
    }),
  );
};

const upgrade = async (
  { nodeVersion, nodeTypesVersion }: Versions,
  dir: string,
) => {
  await Promise.all(
    subPatches.map((subPatch) =>
      runSubPatch({ nodeVersion, nodeTypesVersion }, dir, subPatch),
    ),
  );
};

export const nodeVersionMigration = async (
  version: number,
  dir = process.cwd(),
) => {
  log.ok(`Upgrading to Node.js ${version}`);
  try {
    const { version: nodeTypesVersion, err } = await getLatestNode22Types();
    if (err) {
      log.warn(err);
    }
    await upgrade({ nodeVersion: version, nodeTypesVersion }, dir);
    log.ok('Upgraded to Node.js', version);
  } catch (err) {
    log.err('Failed to upgrade');
    log.subtle(inspect(err));
    process.exitCode = 1;
  }
};
