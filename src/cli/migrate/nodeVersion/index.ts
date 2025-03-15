import { parse } from 'path';
import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../utils/logging';
import { relock } from '../../../utils/packageManager';
import { createDestinationFileReader } from '../../configure/analysis/project';

import {
  isPatchableNodeVersion,
  isPatchableServerlessVersion,
  isPatchableSkubaType,
} from './checks';
import { getNodeTypesVersion } from './getNodeTypesVersion';

type FileSelector =
  | { files: string; file?: never }
  | { file: string; files?: never };

type SubPatch = FileSelector & {
  tests?: Array<(path: string) => Promise<boolean>>;
  regex?: RegExp;
  replace: string;
};

const subPatches = ({
  nodeVersion,
  nodeTypesVersion,
  ECMAScriptVersion,
}: Versions): SubPatch[] => [
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
    regex: /\bnodejs\d+.x\b/gm,
    tests: [isPatchableServerlessVersion],
    replace: `nodejs${nodeVersion}.x`,
  },
  {
    files: '**/serverless*.y*ml',
    regex: /\bnode\d+\b/gm,
    tests: [isPatchableServerlessVersion],
    replace: `node${nodeVersion}`,
  },

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

  {
    files: '**/.buildkite/*',
    regex:
      /(image: )(public.ecr.aws\/docker\/library\/)?(node:)[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: `$1$2$3${nodeVersion}$5`,
  },
  {
    files: '.node-version*',
    regex: /(\d+(?:\.\d+)*)/g,
    replace: `${nodeVersion}`,
  },

  {
    files: '**/package.json',
    regex: /("@types\/node":\s*")(\^)?(\d+\.\d+\.\d+)(")/gm,
    tests: [isPatchableServerlessVersion],
    replace: `$1$2${nodeTypesVersion}$4`,
  },
  {
    files: '**/package.json',
    regex:
      /(["']engines["']:\s*{[\s\S]*?["']node["']:\s*["']>=)(\d+(?:\.\d+)*)(['"]\s*})/gm,
    tests: [isPatchableServerlessVersion, isPatchableSkubaType],
    replace: `$1${nodeVersion}$3`,
  },

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

const runSubPatch = async (dir: string, patch: SubPatch) => {
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
        const directory = parse(path).dir;
        const results = await Promise.all(
          patch.tests.map((test) => test(directory)),
        );
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
  for (const subPatch of subPatches(versions)) {
    await runSubPatch(dir, subPatch);
  }
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
    if (!(await isPatchableNodeVersion(nodeVersion, dir))) {
      throw new Error('Node.js version is not patchable');
    }

    const { version: nodeTypesVersion, err } = await getNodeTypesVersion(
      nodeVersion,
      defaultNodeTypesVersion,
    );
    if (err) {
      log.warn(err);
    }
    await upgrade({ nodeVersion, nodeTypesVersion, ECMAScriptVersion }, dir);
    await relock(dir);

    log.ok('Upgraded to Node.js', nodeVersion);
  } catch (error) {
    log.err('Failed to upgrade');
    log.subtle(inspect(error));
    process.exitCode = 1;
  }
};
