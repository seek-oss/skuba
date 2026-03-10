import path from 'path';
import { inspect } from 'util';

import { type Edit, parse } from '@ast-grep/napi';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { patchPnpmWorkspace } from '../../../patchPnpmWorkspace.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const removePnpmPlugin: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const result = await patchPnpmWorkspace(mode);

  if (mode === 'lint') {
    if (!result.ok) {
      return {
        result: 'apply',
      };
    }

    return {
      result: 'skip',
      reason: 'pnpm-workspace.yaml has already been migrated',
    };
  }

  let pnpmWorkspaceFile: string;
  try {
    pnpmWorkspaceFile = await fs.promises.readFile(
      path.join('pnpm-workspace.yaml'),
      'utf8',
    );
  } catch {
    return {
      result: 'skip',
      reason: 'pnpm-workspace.yaml not found',
    };
  }

  registerAstGrepLanguages();

  const ast = parse('yaml', pnpmWorkspaceFile);

  const node = ast.root().find({
    rule: {
      pattern: {
        context: 'configDependencies:',
        selector: 'block_mapping_pair',
      },
    },
  });

  if (node) {
    const mappingItems = node
      .findAll({ rule: { kind: 'block_mapping_pair' } })
      .slice(1); // skip the first mapping pair which is 'configDependencies'

    const pnpmPluginSkubaNode = mappingItems.find((item) =>
      item.text().startsWith('pnpm-plugin-skuba:'),
    );

    if (pnpmPluginSkubaNode) {
      const edits: Edit[] =
        mappingItems.length === 1
          ? [
              {
                startPos: node.range().start.index,
                endPos: node.range().end.index,
                insertedText: '',
              },
            ]
          : [
              {
                startPos: pnpmPluginSkubaNode.range().start.index,
                endPos: pnpmPluginSkubaNode.range().end.index,
                insertedText: '',
              },
            ];

      const updated = ast.root().commitEdits(edits);

      await fs.promises.writeFile(
        path.join('pnpm-workspace.yaml'),
        updated,
        'utf8',
      );
    }
  }

  await exec('pnpm', 'install', '--no-frozen-lockfile', '--prefer-offline');

  return {
    result: 'apply',
  };
};

export const tryRemovePnpmPlugin: PatchFunction = async (config) => {
  try {
    return await removePnpmPlugin(config);
  } catch (err) {
    log.warn('Failed to remove pnpm-plugin-skuba');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
