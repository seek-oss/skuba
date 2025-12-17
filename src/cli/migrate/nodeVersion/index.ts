import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';
import { coerce, lt } from 'semver';

import { log } from '../../../utils/logging.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';

import { isLikelyPackage } from './checks.js';
import { tryUpgradeInfraPackages } from './upgrade.js';

type FileSelector =
  | { files: string; file?: never }
  | { file: string; files?: never };

type ReplaceOptions = {
  version: string;
  string: string;
  captureGroup: number;
};

type SubPatch = FileSelector & {
  type: 'nodejs' | 'ecmascript';
  regex: () => RegExp;
  replace: {
    package?: ReplaceOptions;
    default: ReplaceOptions;
  };
};

const subPatches = ({
  nodeVersion,
  ECMAScriptVersion,
  packageECMAScriptVersion,
  packageNodeVersion,
}: Versions): SubPatch[] => [
  {
    type: 'nodejs',
    file: '.nvmrc',
    regex: () => /.*([0-9.]+).*/gm,
    replace: {
      default: {
        captureGroup: 1,
        string: nodeVersion,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'nodejs',
    files: '**/Dockerfile*',

    regex: () =>
      /^FROM(.*) (public.ecr.aws\/docker\/library\/)?node:([0-9]+(?:\.[0-9]+(?:\.[0-9]+)?)?)(-[a-z0-9]+)?(@sha256:[a-f0-9]{64})?( .*)?$/gm,
    replace: {
      default: {
        captureGroup: 3,
        string: `FROM$1 $2node:${nodeVersion}$4$6`,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'nodejs',
    files: '**/Dockerfile*',
    regex: () =>
      /^FROM(.*) gcr.io\/distroless\/nodejs(\d+)-debian(\d+)(@sha256:[a-f0-9]{64})?(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: {
      default: {
        captureGroup: 2,
        string: `FROM$1 gcr.io/distroless/nodejs${nodeVersion}-debian$3$6$7`,
        version: nodeVersion,
      },
    },
  },

  {
    type: 'nodejs',
    files: '**/serverless*.y*ml',
    regex: () => /\bnodejs(\d+).x\b/gm,
    replace: {
      default: {
        captureGroup: 1,
        string: `nodejs${nodeVersion}.x`,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'nodejs',
    files: '**/serverless*.y*ml',
    regex: () => /\bnode(\d+)\b/gm,
    replace: {
      default: {
        captureGroup: 1,
        string: `node${nodeVersion}`,
        version: nodeVersion,
      },
    },
  },

  {
    type: 'nodejs',
    files: '**/infra/**/*.ts',
    regex: () => /NODEJS_(\d+)_X/g,
    replace: {
      default: {
        captureGroup: 1,
        string: `NODEJS_${nodeVersion}_X`,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'nodejs',
    files: '**/infra/**/*.ts',
    regex: () => /(target:\s*'node)(\d+)(.+)$/gm,
    replace: {
      default: {
        captureGroup: 2,
        string: `$1${nodeVersion}$3`,
        version: nodeVersion,
      },
    },
  },

  {
    type: 'nodejs',
    files: '**/.buildkite/*',
    regex: () =>
      /(image: )(public.ecr.aws\/docker\/library\/)?(node:)([0-9.]+)(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: {
      default: {
        captureGroup: 4,
        string: `$1$2$3${nodeVersion}$5$6`,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'nodejs',
    files: '.node-version*',
    regex: () => /(\d+(?:\.\d+)*)/g,
    replace: {
      default: {
        captureGroup: 1,
        string: `${nodeVersion}`,
        version: nodeVersion,
      },
    },
  },

  {
    type: 'nodejs',
    files: '**/package.json',
    regex: () =>
      /(["']engines["']:\s*{[\s\S]*?["']node["']:\s*["']>=)(\d+(?:\.\d+)*)(['"]\s*})/gm,
    replace: {
      package: {
        string: `$1${packageNodeVersion}$3`,
        version: packageNodeVersion,
        captureGroup: 2,
      },
      default: {
        string: `$1${nodeVersion}$3`,
        version: nodeVersion,
        captureGroup: 2,
      },
    },
  },
  {
    type: 'nodejs',
    files: '**/docker-compose*.y*ml',
    regex: () =>
      /(image: )(public.ecr.aws\/docker\/library\/)?(node:)([0-9.]+)(\.[^- \n]+)?(-[^ \n]+)?$/gm,

    replace: {
      default: {
        captureGroup: 4,
        string: `$1$2$3${nodeVersion}$5$6`,
        version: nodeVersion,
      },
    },
  },
  {
    type: 'ecmascript',
    files: '**/tsconfig*.json',
    regex: () => /("target":\s*")(ES\d+)"/gim,
    replace: {
      package: {
        string: `$1${packageECMAScriptVersion}"`,
        version: packageECMAScriptVersion,
        captureGroup: 2,
      },
      default: {
        string: `$1${ECMAScriptVersion}"`,
        version: ECMAScriptVersion,
        captureGroup: 2,
      },
    },
  },
  {
    type: 'ecmascript',
    files: '**/tsconfig*.json',
    regex: () => /("lib":\s*\[)([\S\s]*?)(ES\d+)([\S\s]*?)(\])/gim,
    replace: {
      package: {
        string: `$1$2${packageECMAScriptVersion}$4$5`,
        version: packageECMAScriptVersion,
        captureGroup: 3,
      },
      default: {
        string: `$1$2${ECMAScriptVersion}$4$5`,
        version: ECMAScriptVersion,
        captureGroup: 3,
      },
    },
  },
];

type Versions = {
  nodeVersion: string;
  ECMAScriptVersion: string;
  packageNodeVersion: string;
  packageECMAScriptVersion: string;
};

const getTemplatedReplace = async (
  path: string,
  replace: SubPatch['replace'],
): Promise<ReplaceOptions> => {
  if (!replace.package) {
    return replace.default;
  }

  const isPackage = await isLikelyPackage(path);

  if (isPackage) {
    return replace.package;
  }

  return replace.default;
};

const runSubPatch = async (dir: string, patch: SubPatch) => {
  const readFile = createDestinationFileReader(dir);
  const paths = patch.file
    ? [patch.file]
    : await glob(patch.files ?? [], {
        cwd: dir,
        ignore: ['**/node_modules/**'],
      });

  await Promise.all(
    paths.map(async (path) => {
      const contents = await readFile(path);
      if (!contents) {
        return;
      }

      const regexResult = patch.regex().exec(contents);

      if (!regexResult) {
        return;
      }

      const templateReplace = await getTemplatedReplace(path, patch.replace);

      if (
        !lessThan(
          regexResult[templateReplace.captureGroup] as string,
          templateReplace.version,
        )
      ) {
        return;
      }

      await writePatchedContents({
        path,
        contents,
        templated: templateReplace.string,
        regex: patch.regex,
      });
    }),
  );
};

const lessThan = (versionA: string, versionB: string) => {
  if (versionA.toLowerCase().startsWith('es')) {
    return Number(versionA.slice(2)) < Number(versionB.slice(2));
  }

  const coersedA = coerce(versionA);
  const coersedB = coerce(versionB);

  if (!coersedA || !coersedB) {
    throw new Error(
      `Unable to coerce versions for comparison: "${versionA}" and "${versionB}"`,
    );
  }

  return lt(coersedA, coersedB);
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
  regex: () => RegExp;
}) => {
  const modified = contents.replaceAll(regex(), templated);
  await fs.promises.writeFile(path, modified);
};

const upgrade = async (versions: Versions, dir: string) => {
  for (const subPatch of subPatches(versions)) {
    await runSubPatch(dir, subPatch);
  }
};

export const nodeVersionMigration = async (
  {
    nodeVersion,
    ECMAScriptVersion,
    packageNodeVersion,
    packageECMAScriptVersion,
    infraPackages,
  }: {
    nodeVersion: string;
    ECMAScriptVersion: string;
    packageNodeVersion: string;
    packageECMAScriptVersion: string;
    infraPackages: Array<{ name: string; version: string }>;
  },
  dir = process.cwd(),
) => {
  log.ok(
    `Upgrading project to Node.js ${nodeVersion} and package targets to Node.js ${packageNodeVersion}`,
  );

  try {
    await tryUpgradeInfraPackages('format', infraPackages);
    await upgrade(
      {
        nodeVersion,
        ECMAScriptVersion,
        packageNodeVersion,
        packageECMAScriptVersion,
      },
      dir,
    );

    log.ok(
      `Upgraded project to Node.js ${nodeVersion} and package targets to Node.js ${packageNodeVersion}`,
    );
  } catch (error) {
    log.err('Failed to upgrade');
    log.subtle(inspect(error));
    process.exitCode = 1;
  }
};
