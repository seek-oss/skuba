import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../utils/logging';
import { createDestinationFileReader } from '../../../analysis/project';

type SubPatch = (
  | { files: string; file?: never }
  | { file: string; files?: never }
) & {
  test: RegExp;
  replace: string;
};

const subPatches: SubPatch[] = [
  { file: '.nvmrc', test: /^v?18.*/gm, replace: '20' },
  {
    files: 'Dockerfile*',
    test: /^FROM(.*) node:18(\.[^- \n]+)?(-[^ \n]+)?( .+|)$/gm,
    replace: 'FROM$1 node:20$3$4',
  },
  {
    files: 'Dockerfile*',
    test: /^FROM(.*) gcr.io\/distroless\/nodejs18-debian(.+)$/gm,
    replace: 'FROM$1 gcr.io/distroless/nodejs20-debian$2',
  },
  {
    files: 'serverless*.y*ml',
    test: /nodejs(16|18).x/gm,
    replace: 'nodejs20.x',
  },
  {
    files: 'infra/**/*.ts',
    test: /NODEJS_(16|18)_X/g,
    replace: 'NODEJS_20_X',
  },
];

const runSubPatch = async (
  mode: 'format' | 'lint',
  dir: string,
  { file, files, test, replace }: SubPatch,
): Promise<boolean> => {
  const readFile = createDestinationFileReader(dir);
  const paths = file ? [file] : await glob(files ?? [], { cwd: dir });

  return (
    await Promise.all(
      paths.map(async (path) => {
        const contents = await readFile(path);
        if (!contents) {
          return false;
        }

        const patched = contents.replaceAll(test, replace);
        if (patched === contents) {
          return false;
        }

        if (mode === 'format') {
          await fs.promises.writeFile(path, patched);
        }

        return true;
      }),
    )
  ).some((result) => result);
};

const upgradeToNode20 = async (
  mode: 'format' | 'lint',
  dir: string,
): Promise<PatchReturnType> => {
  const results = await Promise.all(
    subPatches.map((subPatch) => runSubPatch(mode, dir, subPatch)),
  );

  return results.some((result) => result)
    ? { result: 'apply' }
    : { result: 'skip', reason: 'unable to find any Node.js <20 usage' };
};

export const tryUpgradeToNode20: PatchFunction = async (
  mode: 'format' | 'lint',
  dir = process.cwd(),
) => {
  if (process.env.SKIP_NODE_20_PATCH) {
    log.warn(
      'Skipping Node.js 20 patch due to SKIP_NODE_20_PATCH environment variable',
    );

    return {
      result: 'apply', // because we don't want to try again
    };
  }

  try {
    return await upgradeToNode20(mode, dir);
  } catch (err) {
    log.warn('Failed to upgrade Node.js to 20');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
