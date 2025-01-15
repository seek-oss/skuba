import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging';
import { createDestinationFileReader } from '../../configure/analysis/project';

import { getNode22TypesVersion } from './getNode22TypesVersion';
import { validServerlessVersion, validSkubaType } from './packageJsonChecks';

const DEFAULT_NODE_TYPES = '22.9.0';

type SubPatch =
  | (({ files: string; file?: never } | { file: string; files?: never }) & {
      test?: RegExp;
      replace: string;
      id: string;
    })
  | Array<
      ({ files: string; file?: never } | { file: string; files?: never }) & {
        test?: RegExp;
        replace: string;
        id: string;
      }
    >;

type VersionResult = {
  version: string;
  err: string | undefined;
};

export const getNode22TypeVersion = (
  major: number,
  defaultVersion: string,
): VersionResult => {
  try {
    const version = getNode22TypesVersion(major);
    const versionRegex = /(22\.\d+\.\d+)/;
    if (!version || !versionRegex.test(version)) {
      throw new Error('No version found');
    }
    const sanitizedVersion = version
      .replace(versionRegex, '$1')
      .replace(/"/g, '')
      .trim();
    return {
      version: sanitizedVersion,
      err: undefined,
    };
  } catch {
    return {
      version: defaultVersion,
      err: 'Failed to fetch latest version, using fallback version',
    };
  }
};

const SHA_REGEX = /(?<=node.*)(@sha256:[a-f0-9]{64})/gm;

const subPatches: SubPatch[] = [
  { id: 'nvmrc', file: '.nvmrc', replace: '<%- version %>\n' },
  {
    id: 'Dockerfile-1',
    files: '**/Dockerfile*',
    test: /^FROM(.*) (public.ecr.aws\/docker\/library\/)?node:[0-9.]+(@sha256:[a-f0-9]{64})?(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: 'FROM$1 $2node:<%- version %>$3$5$6',
  },
  {
    id: 'Dockerfile-2',
    files: '**/Dockerfile*',
    test: /^FROM(.*) gcr.io\/distroless\/nodejs\d+-debian(.+)$/gm,
    replace: 'FROM$1 gcr.io/distroless/nodejs<%- version %>-debian$2',
  },
  {
    id: 'serverless',
    files: '**/serverless*.y*ml',
    test: /nodejs\d+.x/gm,
    replace: 'nodejs<%- version %>.x',
  },
  [
    {
      id: 'cdk-1',
      files: '**/infra/**/*.ts',
      test: /NODEJS_\d+_X/g,
      replace: 'NODEJS_<%- version %>_X',
    },
    {
      id: 'cdk-2',
      files: '**/infra/**/*.ts',
      test: /(target:\s*'node)(\d+)(.+)$/gm,
      replace: '$1<%- version %>$3',
    },
  ],
  {
    id: 'buildkite',
    files: '**/.buildkite/*',
    test: /(image: )(public.ecr.aws\/docker\/library\/)?(node:)[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: '$1$2$3<%- version %>$5',
  },
  {
    id: 'node-version',
    files: '.node-version*',
    test: /(v)?\d+\.\d+\.\d+(.+)?/gm,
    replace: '$1<%- version %>$2',
  },
  [
    {
      id: 'package-json-1',
      files: '**/package.json',
      test: /(\\?"@types\/node\\?": \\?")(\^)?[0-9.]+(\\?(",?)\\?n?)/gm,
      replace: '$1$2<%- version %>$4',
    },
    {
      id: 'package-json-2',
      files: '**/package.json',
      test: /(\\?"engines\\?":\s*{\\?n?[^}]*\\?"node\\?":\s*\\?">=)(\d+)\\?("[^}]*})(?![^}]*\\?"skuba\\?":\s*{\\?n?[^}]*\\?"type\\?":\s*\\?"package\\?")/gm,
      replace: '$1<%- version %>$3',
    },
  ],
  {
    id: 'tsconfig',
    files: '**/tsconfig.json',
    test: /("target":\s*")(ES?:[0-9]+|Next|[A-Za-z]+[0-9]*)"/gim,
    replace: '$1<%- version %>"',
  },
  {
    id: 'docker-compose',
    files: '**/docker-compose*.y*ml',
    test: /(image: )(public.ecr.aws\/docker\/library\/)?(node:)[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: '$1$2$3<%- version %>$5',
  },
];

const removeNodeShas = (content: string): string =>
  content.replace(SHA_REGEX, '');

type Versions = {
  nodeVersion: number;
  nodeTypesVersion: string;
  ECMAScriptVersion: string;
};

const runSubPatch = async (
  { nodeVersion, nodeTypesVersion, ECMAScriptVersion }: Versions,
  dir: string,
  patch: SubPatch,
) => {
  if (Array.isArray(patch)) {
    for (const subPatch of patch) {
      await runSubPatch(
        { nodeVersion, nodeTypesVersion, ECMAScriptVersion },
        dir,
        subPatch,
      );
    }
    return;
  }
  const readFile = createDestinationFileReader(dir);
  const paths = patch.file
    ? [patch.file]
    : await glob(patch.files ?? [], { cwd: dir });

  await Promise.all(
    paths.map(async (path) => {
      if (path.includes('node_modules')) {
        return;
      }
      const contents = await readFile(path);
      if (!contents) {
        return;
      }

      if (patch.test && !patch.test.test(contents)) {
        return;
      }

      const unPinnedContents = removeNodeShas(contents);

      if (patch.id === 'serverless') {
        if (!(await validServerlessVersion())) {
          return;
        }
      }

      if (patch.id === 'package-json-1') {
        if (!(await validServerlessVersion())) {
          return;
        }
        return await writePatchedContents({
          path,
          contents: unPinnedContents,
          templated: patch.replace.replaceAll(
            '<%- version %>',
            nodeTypesVersion,
          ),
          test: patch.test,
        });
      }
      if (patch.id === 'tsconfig') {
        if (!(await validServerlessVersion()) || !(await validSkubaType())) {
          return;
        }
        return await writePatchedContents({
          path,
          contents: unPinnedContents,
          templated: patch.replace.replaceAll(
            '<%- version %>',
            ECMAScriptVersion,
          ),
          test: patch.test,
        });
      }

      if (patch.id === 'package-json-2') {
        if (!(await validServerlessVersion()) || !(await validSkubaType())) {
          return;
        }
      }

      await writePatchedContents({
        path,
        contents: unPinnedContents,
        templated: patch.replace.replaceAll(
          '<%- version %>',
          nodeVersion.toString(),
        ),
        test: patch.test,
      });
    }),
  );
};

const writePatchedContents = async ({
  path,
  contents,
  templated,
  test,
}: {
  path: string;
  contents: string;
  templated: string;
  test?: RegExp;
}) =>
  await fs.promises.writeFile(
    path,
    test ? contents.replaceAll(test, templated) : templated,
  );

const upgrade = async (
  { nodeVersion, nodeTypesVersion, ECMAScriptVersion }: Versions,
  dir: string,
) => {
  await Promise.all(
    subPatches.map((subPatch) =>
      runSubPatch(
        { nodeVersion, nodeTypesVersion, ECMAScriptVersion },
        dir,
        subPatch,
      ),
    ),
  );
};

export const nodeVersionMigration = async (
  {
    nodeVersion,
    ECMAScriptVersion,
  }: { nodeVersion: number; ECMAScriptVersion: string },
  dir = process.cwd(),
) => {
  log.ok(`Upgrading to Node.js ${nodeVersion}`);
  try {
    const { version: nodeTypesVersion, err } = getNode22TypeVersion(
      nodeVersion,
      DEFAULT_NODE_TYPES,
    );
    if (err) {
      log.warn(err);
    }
    await upgrade({ nodeVersion, nodeTypesVersion, ECMAScriptVersion }, dir);
    log.ok('Upgraded to Node.js', nodeVersion);
  } catch (err) {
    log.err('Failed to upgrade');
    log.subtle(inspect(err));
    process.exitCode = 1;
  }
};
