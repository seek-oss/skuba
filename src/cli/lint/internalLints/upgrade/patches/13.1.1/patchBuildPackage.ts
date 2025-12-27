import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { parseAsync, registerDynamicLanguage } from '@ast-grep/napi';
import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { isLikelyPackage } from '../../../../../migrate/nodeVersion/checks.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const patchBuildPackage: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let packageJsonPaths: string[];
  try {
    packageJsonPaths = await glob(
      ['package.json', 'packages/**/package.json'],
      {
        ignore: ['**/.git', '**/node_modules'],
      },
    );
  } catch {
    return {
      result: 'skip',
      reason: 'unable to find package.json files',
    };
  }

  if (packageJsonPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'unable to find package.json files',
    };
  }

  const likelyPackagePaths = (
    await Promise.all(
      packageJsonPaths.map(async (path) =>
        (await isLikelyPackage(path)) ? path : null,
      ),
    )
  ).filter((path): path is string => path !== null);

  registerDynamicLanguage({ json });

  let foundMatch = false;

  for (const path of likelyPackagePaths) {
    let packageJsonContent: string;
    try {
      packageJsonContent = await fs.promises.readFile(path, 'utf8');
    } catch {
      return {
        result: 'skip',
        reason: `unable to read package.json at ${path}`,
      };
    }
    const packageJson = await parseAsync('json', packageJsonContent);
    const ast = packageJson.root();

    const buildCmd = ast.find({
      rule: {
        pattern: '"skuba build-package"',
      },
    });

    if (!buildCmd) {
      continue;
    }

    foundMatch = true;

    if (mode === 'lint') {
      continue;
    }

    const edit = buildCmd.replace('"tsdown"');

    const newSource = ast.commitEdits([edit]);

    await fs.promises.writeFile(path, newSource, 'utf8');
  }

  if (foundMatch) {
    return {
      result: 'apply',
    };
  }

  return {
    result: 'skip',
    reason: 'no skuba build-package command found',
  };
};

export const tryPatchBuildPackage: PatchFunction = async (config) => {
  try {
    return await patchBuildPackage(config);
  } catch (err) {
    log.warn('Failed to patch root `package.json.json`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to package.json error' };
  }
};
