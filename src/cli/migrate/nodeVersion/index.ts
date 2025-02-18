import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging';
import { createDestinationFileReader } from '../../configure/analysis/project';

import { getNodeTypesVersion } from './getNodeTypesVersion';
import {
  isPatchableServerlessVersion,
  isPatchableSkubaType,
} from './packageJsonChecks';

type FileSelector =
  | { files: string; file?: never }
  | { file: string; files?: never };

type SubPatch = FileSelector & {
  tests?: Array<() => Promise<boolean>>;
  regex?: RegExp;
  replace: string;
};

type SubPatches = SubPatch | SubPatch[];

const subPatches = ({
  nodeVersion,
  nodeTypesVersion,
  ECMAScriptVersion,
}: Versions): SubPatches[] => [
  { file: '.nvmrc', replace: `${nodeVersion}\n` },
  {
    files: '**/Dockerfile*',

    regex:
      /^FROM(.*) (public.ecr.aws\/docker\/library\/)?node:([0-9]+(?:\.[0-9]+(?:\.[0-9]+)?)?)(-[a-z0-9]+)?(@sha256:[a-f0-9]{64})?( .*)?$/gm,
    replace: `FROM$1 $2node:${nodeVersion}$4$6`,
  },
  {
    files: '**/Dockerfile*',
    regex:
      /^FROM(.*) gcr.io\/distroless\/nodejs\d+-debian(\d+)(@sha256:[a-f0-9]{64})?(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: `FROM$1 gcr.io/distroless/nodejs${nodeVersion}-debian$2$4$5$6`,
  },
  {
    files: '**/serverless*.y*ml',
    regex: /nodejs\d+.x/gm,
    tests: [isPatchableServerlessVersion],
    replace: `nodejs${nodeVersion}.x`,
  },
  [
    {
      files: '**/infra/**/*.ts',
      regex: /NODEJS_\d+_X/g,
      replace: `NODEJS_${nodeVersion}_X`,
    },
    {
      files: '**/infra/**/*.ts',
      regex: /(target:\s*'node)(\d+)(.+)$/gm,
      replace: `$1${nodeVersion}$3`,
    },
  ],
  {
    files: '**/.buildkite/*',
    regex:
      /(image: )(public.ecr.aws\/docker\/library\/)?(node:)[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: `$1$2$3${nodeVersion}$5`,
  },
  {
    files: '.node-version*',
    regex: /(v)?\d+\.\d+\.\d+(.+)?/gm,
    replace: `$1${nodeVersion}$2`,
  },
  [
    {
      files: '**/package.json',
      regex: /(\\?"@types\/node\\?": \\?")(\^)?[0-9.]+(\\?(",?)\\?n?)/gm,
      tests: [isPatchableServerlessVersion],
      replace: `$1$2${nodeTypesVersion}$4`,
    },
    {
      files: '**/package.json',
      regex:
        /(\\?"engines\\?":\s*{\\?n?[^}]*\\?"node\\?":\s*\\?">=)(\d+)\\?("[^}]*})(?![^}]*\\?"skuba\\?":\s*{\\?n?[^}]*\\?"type\\?":\s*\\?"package\\?")/gm,
      tests: [isPatchableServerlessVersion, isPatchableSkubaType],
      replace: `$1${nodeVersion}$3`,
    },
  ],
  [
    {
      files: '**/tsconfig*.json',
      regex: /("target":\s*")(ES\d+)"/gim,
      tests: [isPatchableServerlessVersion, isPatchableSkubaType],
      replace: `$1${ECMAScriptVersion}"`,
    },
    {
      files: '**/tsconfig*.json',
      regex: /("lib":\s*\[)([\S\s]*?)(ES\d+)([\S\s]*?)(\])/gim,
      tests: [isPatchableServerlessVersion, isPatchableSkubaType],
      replace: `$1$2${ECMAScriptVersion}$4$5`,
    },
  ],
  {
    files: '**/docker-compose*.y*ml',
    regex:
      /(image: )(public.ecr.aws\/docker\/library\/)?(node:)[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,

    replace: `$1$2$3${nodeVersion}$5`,
  },
];

type Versions = {
  nodeVersion: number;
  nodeTypesVersion: string;
  ECMAScriptVersion: string;
};

const runSubPatch = async (dir: string, patch: SubPatches) => {
  if (Array.isArray(patch)) {
    for (const subPatch of patch) {
      await runSubPatch(dir, subPatch);
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

      if (patch.regex && !patch.regex.test(contents)) {
        return;
      }

      if (patch.tests) {
        const results = await Promise.all(patch.tests.map((test) => test()));
        if (!results.every(Boolean)) {
          return;
        }
      }

      await writePatchedContents({
        path,
        contents,
        templated: patch.replace,
        regex: patch.regex,
      });
    }),
  );
};

const writePatchedContents = async ({
  path,
  contents,
  templated,
  regex,
}: {
  path: string;
  contents: string;
  templated: string;
  regex?: RegExp;
}) =>
  await fs.promises.writeFile(
    path,
    regex ? contents.replaceAll(regex, templated) : templated,
  );

const upgrade = async (versions: Versions, dir: string) => {
  await Promise.all(
    subPatches(versions).map((subPatch) => runSubPatch(dir, subPatch)),
  );
};

export const nodeVersionMigration = async (
  {
    nodeVersion,
    ECMAScriptVersion,
    defaultNodeTypesVersion,
  }: {
    nodeVersion: number;
    ECMAScriptVersion: string;
    defaultNodeTypesVersion: string;
  },
  dir = process.cwd(),
) => {
  log.ok(`Upgrading to Node.js ${nodeVersion}`);
  try {
    const { version: nodeTypesVersion, err } = await getNodeTypesVersion(
      nodeVersion,
      defaultNodeTypesVersion,
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
