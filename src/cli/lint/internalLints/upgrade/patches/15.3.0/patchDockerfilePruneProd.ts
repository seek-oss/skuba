import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const pnpmInstallProdLineRegex = /^RUN (CI=true )?pnpm install.*--prod/;
const pnpmPruneProdLine = 'RUN pnpm prune --prod';

/**
 * Rewrites a Dockerfile's contents, replacing `RUN pnpm install … --prod`
 * lines with `RUN pnpm prune --prod`, except when the install line is
 * immediately preceded by `RUN pnpm prune --prod`.
 *
 * The preceded case is an intentional monorepo workaround for
 * https://github.com/pnpm/pnpm/issues/8307, where `pnpm prune --prod` alone
 * does not correctly prune dev dependencies and a follow-up
 * `pnpm install --prod` is required.
 *
 * Returns `null` when no changes are required.
 */
const rewriteDockerfile = (contents: string): string | null => {
  const lines = contents.split('\n');
  let changed = false;

  const updatedLines = lines.map((line, index) => {
    if (!pnpmInstallProdLineRegex.test(line)) {
      return line;
    }

    const previousLine = index > 0 ? lines[index - 1] : '';
    if (previousLine?.startsWith(pnpmPruneProdLine)) {
      return line;
    }

    changed = true;
    return pnpmPruneProdLine;
  });

  return changed ? updatedLines.join('\n') : null;
};

export const patchDockerfilePruneProd = async (
  mode: 'lint' | 'format',
): Promise<PatchReturnType> => {
  const dockerfilePaths = await fg(['**/Dockerfile*'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (dockerfilePaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no dockerfiles found',
    };
  }

  const dockerfiles = await Promise.all(
    dockerfilePaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
        updatedContents: rewriteDockerfile(contents),
      };
    }),
  );

  const dockerfilesToPatch = dockerfiles.filter(
    (entry): entry is typeof entry & { updatedContents: string } =>
      entry.updatedContents !== null,
  );

  if (dockerfilesToPatch.length === 0) {
    return {
      result: 'skip',
      reason: 'no dockerfiles to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    dockerfilesToPatch.map(async ({ file, updatedContents }) => {
      await fs.promises.writeFile(file, updatedContents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchDockerfilePruneProd: PatchFunction = async ({ mode }) => {
  try {
    return await patchDockerfilePruneProd(mode);
  } catch (err) {
    log.warn('Failed to apply Dockerfile pnpm prune --prod patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
