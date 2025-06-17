/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import type { PatchFunction, PatchReturnType } from '../..';
import { log } from '../../../../../../utils/logging';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

const regex = /\s*--ignore-optional/;

const removeYarnIgnoreFlag = (contents: string) => {
  let isInYarn = false;

  const lines = contents.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.includes('yarn')) {
      isInYarn = true;
    }

    if (isInYarn && regex.test(line)) {
      lines[i] = line.replace(regex, '');

      // If we're now an empty line, remove it and get rid of the \ at the end of the previous line
      if (!lines[i]!.trim()) {
        lines.splice(i, 1);
        if (i > 0) {
          lines[i - 1] = lines[i - 1]!.replace(/\s*\\$/, '');
        }
        i--;
      } else if (lines[i] === '\\') {
        lines.splice(i, 1);
        i--;
      }

      isInYarn = false;
    }

    if (!line.endsWith('\\')) {
      isInYarn = false;
    }
  }

  return lines.join('\n');
};

const removeYarnIgnoreOptionalFlags: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const maybeDockerFilesPaths = await glob(['Dockerfile*']);

  if (!maybeDockerFilesPaths.length) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles found',
    };
  }

  const dockerFiles = await fetchFiles(maybeDockerFilesPaths);

  const mapped = dockerFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    after: removeYarnIgnoreFlag(contents),
  }));

  if (!mapped.some(({ before, after }) => before !== after)) {
    return {
      result: 'skip',
      reason: 'no Dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, after }) => {
      await fs.promises.writeFile(file, after);
    }),
  );

  return { result: 'apply' };
};

export const tryRemoveYarnIgnoreOptionalFlags: PatchFunction = async (
  config,
) => {
  try {
    return await removeYarnIgnoreOptionalFlags(config);
  } catch (err) {
    log.warn('Failed to remove yarn --ignore-optional flags');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
