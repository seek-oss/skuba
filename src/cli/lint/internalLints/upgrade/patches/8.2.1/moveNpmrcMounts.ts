import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const moveNpmrcMounts: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const buildkiteFiles = await glob(
    ['{apps/*/,packages/*/,./}.buildkite/**/*.y*ml'],
    { onlyFiles: true },
  );

  if (buildkiteFiles.length === 0) {
    return { result: 'skip', reason: 'no Buildkite files found' };
  }

  const input = await Promise.all(
    buildkiteFiles.map((name) => fs.readFile(name, 'utf-8')),
  );

  const replaced = input.map(moveNpmrcMountsInFile);

  if (replaced.every((r, i) => r === input[i])) {
    return {
      result: 'skip',
      reason: 'no .npmrc mounts found need to be updated',
    };
  }

  if (mode === 'lint') {
    return { result: 'apply' };
  }

  await Promise.all(
    buildkiteFiles.flatMap((name, i) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      replaced[i] !== input[i] ? [fs.writeFile(name, replaced[i]!)] : [],
    ),
  );

  return { result: 'apply' };
};

const secret = /^(\s*)secrets: id=npm,src=tmp\/\.npmrc(\s*#?.*)$/gm;
const outputPath = /^(\s*)output-path: tmp\/(\s*#?.*)$/gm;

const moveNpmrcMountsInFile = (input: string) => {
  if (!secret.test(input) || !outputPath.test(input)) {
    return input;
  }

  return input
    .replaceAll(secret, '$1secrets: id=npm,src=/tmp/.npmrc$2')
    .replaceAll(outputPath, '$1output-path: /tmp/$2');
};

export const tryMoveNpmrcMounts: PatchFunction = async (config) => {
  try {
    return await moveNpmrcMounts(config);
  } catch (err) {
    log.warn('Failed to move .npmrc mounts');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
