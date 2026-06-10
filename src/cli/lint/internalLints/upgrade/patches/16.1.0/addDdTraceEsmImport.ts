import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import {
  appendDdTraceToCdkNodeOptions,
  appendDdTraceToServerlessNodeOptions,
  collectLambdaFiles,
} from '../../../../../migrate/esm/datadogNodeOptions.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const patchCdkFile = async (contents: string): Promise<string | null> => {
  const astRoot = (await parseAsync('TypeScript', contents)).root();

  const datadogSettings = astRoot.find({
    rule: {
      kind: 'object',
      inside: {
        kind: 'arguments',
        inside: {
          kind: 'new_expression',
          regex: '^new DatadogLambda',
        },
      },
    },
  });

  const redirectHandler = datadogSettings?.find({
    rule: {
      kind: 'pair',
      regex: '^redirectHandler',
    },
  });

  if (redirectHandler?.field('value')?.text() !== 'false') {
    return null;
  }

  const workerAst = astRoot.find({
    rule: {
      kind: 'new_expression',
      regex: '^new (aws_lambda_nodejs.NodejsFunction|NodejsFunction)',
    },
  });

  if (!workerAst) {
    return null;
  }

  const edits: Edit[] = [];
  appendDdTraceToCdkNodeOptions(workerAst, edits);

  if (!edits.length) {
    return null;
  }

  return astRoot.commitEdits(edits);
};

const patchServerlessFile = async (
  contents: string,
): Promise<string | null> => {
  const astRoot = (await parseAsync('yaml', contents)).root();

  const redirectHandlers = astRoot.find({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^redirectHandlers:',
    },
  });

  if (!redirectHandlers?.text().includes('false')) {
    return null;
  }

  const edits: Edit[] = [];
  appendDdTraceToServerlessNodeOptions(astRoot, edits);

  if (!edits.length) {
    return null;
  }

  return astRoot.commitEdits(edits);
};

const addDdTraceEsmImportPatch: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const { tsFiles, serverlessFiles, containsDatadogLambdaImport } =
    await collectLambdaFiles();

  if (serverlessFiles.length) {
    registerAstGrepLanguages();
  }

  const patchedFiles = (
    await Promise.all([
      ...tsFiles.map(async ({ file, contents }) => {
        if (
          !contents.includes('NodejsFunction') ||
          !contents.includes('redirectHandler')
        ) {
          return null;
        }

        const patched = await patchCdkFile(contents);
        return patched ? { file, contents: patched } : null;
      }),
      ...serverlessFiles.map(async ({ file, contents }) => {
        if (
          !containsDatadogLambdaImport ||
          !contents.includes('redirectHandlers')
        ) {
          return null;
        }

        const patched = await patchServerlessFile(contents);
        return patched ? { file, contents: patched } : null;
      }),
    ])
  ).filter((file) => file !== null);

  if (!patchedFiles.length) {
    return {
      result: 'skip',
      reason: 'no lambdas to patch',
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

export const tryAddDdTraceEsmImport: PatchFunction = async (config) => {
  try {
    return await addDdTraceEsmImportPatch(config);
  } catch (err) {
    log.warn('Failed to add dd-trace ESM import to NODE_OPTIONS');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
