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

const subPatches: SubPatch[] = [
  { file: '.nvmrc', replace: '<%- version %>\n' },
  {
    files: 'Dockerfile*',
    test: /^FROM(.*) node:[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: 'FROM$1 node:<%- version %>$3$4',
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
    files: '.buildkite/*',
    test: /image: node:[0-9.]+(\.[^- \n]+)?(-[^ \n]+)?$/gm,
    replace: 'image: node:<%- version %>$2',
  },
];

const runSubPatch = async (version: number, dir: string, patch: SubPatch) => {
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

      const templated = patch.replace.replaceAll(
        '<%- version %>',
        version.toString(),
      );

      await fs.promises.writeFile(
        path,
        patch.test ? contents.replaceAll(patch.test, templated) : templated,
      );
    }),
  );
};

const upgrade = async (version: number, dir: string) => {
  await Promise.all(
    subPatches.map((subPatch) => runSubPatch(version, dir, subPatch)),
  );
};

export const nodeVersionMigration = async (
  version: number,
  dir = process.cwd(),
) => {
  log.ok(`Upgrading to Node.js ${version}`);
  try {
    await upgrade(version, dir);
    log.ok('Upgraded to Node.js', version);
  } catch (err) {
    log.err('Failed to upgrade');
    log.subtle(inspect(err));
    process.exitCode = 1;
  }
};
