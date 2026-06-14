import { inspect } from 'util';

import { parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { removeVitestImportsEdits } from '../../../../../migrate/esm/vitest/postFixVitestMigration.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const removeVitestImports: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const allTsFiles = await fg(['**/*.ts'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  const files = await Promise.all(
    allTsFiles.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');
      return {
        file,
        contents,
      };
    }),
  );

  const changedFiles = await Promise.all(
    files.map(async ({ file, contents }) => {
      const ast = await parseAsync('TypeScript', contents);
      const root = ast.root();
      const edits = removeVitestImportsEdits(root);

      if (edits.length === 0) {
        return undefined;
      }

      const updated = root.commitEdits(edits);
      return {
        file,
        updated,
      };
    }),
  );

  const actualChangedFiles = changedFiles.filter((file) => file !== undefined);

  if (actualChangedFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'Vitest imports have already been removed',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    actualChangedFiles.map(async ({ file, updated }) => {
      await fs.promises.writeFile(file, updated, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryRemoveVitestImports: PatchFunction = async (
  config,
): Promise<PatchReturnType> => {
  try {
    return await removeVitestImports(config);
  } catch (err) {
    log.warn('Failed to remove Vitest imports');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
