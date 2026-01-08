
import path from 'path';
import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { parseAsync, registerDynamicLanguage } from '@ast-grep/napi';
import fs from 'fs-extra';


import { createExec } from '../../../../../../utils/exec.js';
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

  // @ast-grep/json requires a postinstall step to build the native bindings
  // which may not have run in alpine due to pnpm not trusting scripts by default
  try {
    const astGrepJsonDir = path.dirname(
      require.resolve('@ast-grep/lang-json/package.json'),
    );
    const exec = createExec({
      cwd: astGrepJsonDir,
    })
    await exec('npm', 'run', 'postinstall');
  } catch (err) {
    log.warn('Failed to run @ast-grep/lang-json postinstall step, AST parsing may fail');
    log.subtle(inspect(err));
  }

  registerDynamicLanguage({ json });
  const tsconfig = await parseAsync('json', tsconfigFile);
  const ast = tsconfig.root();

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
