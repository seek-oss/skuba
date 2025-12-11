import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { parse, registerDynamicLanguage } from '@ast-grep/napi';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const patchRootConfig: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let tsconfigFile: string;
  try {
    tsconfigFile = await fs.promises.readFile('tsconfig.json', 'utf8');
  } catch {
    return {
      result: 'skip',
      reason: 'no root tsconfig.json found',
    };
  }

  registerDynamicLanguage({ json });
  const ast = parse('json', tsconfigFile).root();

  const compilerOptionsObj = ast.find({
    rule: {
      pattern: {
        context: '{"compilerOptions":}',
        selector: 'pair',
      },
    },
  });

  if (!compilerOptionsObj) {
    const startingBracket = ast.find({ rule: { pattern: '{' } });

    if (!startingBracket) {
      return {
        result: 'skip',
        reason: 'Unable to parse tsconfig.json',
      };
    }

    const edit = startingBracket.replace(
      `{
  "compilerOptions": {
    "rootDir": "."
  },`,
    );

    const newSource = ast.commitEdits([edit]);

    if (mode === 'lint') {
      return {
        result: 'apply',
      };
    }

    await fs.promises.writeFile('tsconfig.json', newSource, 'utf8');

    return {
      result: 'apply',
    };
  }

  const rootDirOption = compilerOptionsObj.find({
    rule: { pattern: '"rootDir"' },
  });

  if (rootDirOption) {
    return {
      result: 'skip',
      reason: 'rootDir already set in tsconfig.json',
    };
  }

  const compilerOptionsStart = compilerOptionsObj.find({
    rule: { pattern: '{' },
  });

  if (!compilerOptionsStart) {
    return {
      result: 'skip',
      reason: 'Unable to parse tsconfig.json compilerOptions',
    };
  }

  const edit = compilerOptionsStart.replace(`{
    "rootDir": ".",`);

  const newSource = ast.commitEdits([edit]);

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await fs.promises.writeFile('tsconfig.json', newSource, 'utf8');

  return {
    result: 'apply',
  };
};

export const tryPatchRootTsConfig: PatchFunction = async (config) => {
  try {
    return await patchRootConfig(config);
  } catch (err) {
    log.warn('Failed to patch root `tsconfig.json`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
