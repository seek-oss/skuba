import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

import * as Git from '@skuba-lib/api/git';

const patchAttwTrue = (ast: SgNode, contents: string): Edit[] => {
  const pairs = ast.findAll({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^attw$',
      },
    },
  });

  const edits: Edit[] = [];

  for (const pair of pairs) {
    if (pair.field('value')?.text() !== 'true') {
      continue;
    }

    const { column, index } = pair.range().start;
    const indent =
      /^\s*/.exec(contents.slice(index - column, index))?.[0] ?? '';

    edits.push(
      pair.replace(`attw: {\n${indent}  profile: 'node16',\n${indent}}`),
    );
  }

  return edits;
};

export const patchAttwNode16: PatchFunction = async ({
  mode,
  dir = process.cwd(),
}): Promise<PatchReturnType> => {
  const gitRoot = await Git.findRoot({ dir });
  const root = gitRoot ?? dir;

  const tsdownFiles = await fg('**/tsdown.config.{mts,ts}', {
    cwd: root,
    ignore: ['**/.git', '**/node_modules'],
  });

  if (tsdownFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsdown.config files found',
    };
  }

  const parsedConfigs = await Promise.all(
    tsdownFiles.map(async (file) => {
      const fullPath = path.join(root, file);
      const content = await fs.promises.readFile(fullPath, 'utf8');
      const ast = (await parseAsync('TypeScript', content)).root();
      const edits = patchAttwTrue(ast, content);
      const updated = edits.length ? ast.commitEdits(edits) : undefined;
      return { file: fullPath, updated };
    }),
  );

  const configsToUpdate = parsedConfigs.filter(
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
  );

  if (configsToUpdate.length === 0) {
    return {
      result: 'skip',
      reason: 'no attw: true configs to update',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    configsToUpdate.map(async ({ file, updated }) => {
      await fs.promises.writeFile(file, updated, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchAttwNode16: PatchFunction = async (config) => {
  try {
    return await patchAttwNode16(config);
  } catch (err) {
    log.warn('Failed to update tsdown attw profile to node16');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
