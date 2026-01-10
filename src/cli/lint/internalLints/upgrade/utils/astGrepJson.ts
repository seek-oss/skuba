import path from 'path';
import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { registerDynamicLanguage } from '@ast-grep/napi';

import { createExec } from '../../../../../utils/exec.js';
import { log } from '../../../../../utils/logging.js';

let jsonRegistered = false;

export const installAstGrepJson = async () => {
  if (jsonRegistered) {
    return;
  }

  // @ast-grep/json requires a postinstall step to build the native bindings
  // which may not have run in alpine due to pnpm not trusting scripts by default
  try {
    const treeSitterCliDir = path.dirname(
      require.resolve('tree-sitter-cli/package.json'),
    );
    const treeSitterExec = createExec({
      cwd: treeSitterCliDir,
    });
    await treeSitterExec('npm', 'run', 'install');

    const astGrepJsonDir = path.dirname(
      require.resolve('@ast-grep/lang-json/package.json'),
    );
    const astGrepExec = createExec({
      cwd: astGrepJsonDir,
    });
    await astGrepExec('npm', 'run', 'postinstall');
  } catch (err) {
    log.warn(
      'Failed to run @ast-grep/lang-json postinstall step, AST parsing may fail',
    );
    log.subtle(inspect(err));
  }

  registerDynamicLanguage({ json });

  jsonRegistered = true;
};
