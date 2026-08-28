import path from 'path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

import * as Git from '@skuba-lib/api/git';

const PRETTIER_EXTENSION = 'esbenp.prettier-vscode';
const OXC_EXTENSION = 'oxc.oxc-vscode';

export const migrateVscodePrettierToOxc: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const root = (await Git.findRoot({ dir })) ?? dir;

  const extensionsJsonPaths = await fg(['**/.vscode/extensions.json'], {
    cwd: root,
    dot: true,
    ignore: ['**/.git', '**/node_modules'],
  });

  const patchedFiles = (
    await Promise.all(
      extensionsJsonPaths.map(async (relativePath) => {
        const file = path.join(root, relativePath);
        const contents = await fs.promises.readFile(file, 'utf8');

        if (
          !contents.includes(PRETTIER_EXTENSION) ||
          contents.includes(OXC_EXTENSION)
        ) {
          return null;
        }

        return {
          file,
          contents: contents.replaceAll(PRETTIER_EXTENSION, OXC_EXTENSION),
        };
      }),
    )
  ).filter((file) => file !== null);

  if (patchedFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no Prettier VS Code recommendations to replace',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    patchedFiles.map(async ({ file, contents }) => {
      await fs.promises.writeFile(file, contents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateVscodePrettierToOxc: PatchFunction = async (config) => {
  try {
    return await migrateVscodePrettierToOxc(config);
  } catch (err) {
    log.warn('Failed to replace Prettier VS Code recommendation with Oxc');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
