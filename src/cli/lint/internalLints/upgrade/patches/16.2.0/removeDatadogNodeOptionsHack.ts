import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';
import latest from 'latest-version';

import { log } from '../../../../../../utils/logging.js';
import {
  collectLambdaFiles,
  removeDdTraceFromCdkNodeOptions,
  removeDdTraceFromServerlessNodeOptions,
  removeWholeLine,
} from '../../../../../migrate/esm/datadogNodeOptions.js';
import { upgradeInfraPackages } from '../../../../../migrate/nodeVersion/upgrade.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const DATADOG_LAMBDA_JS_VERSION = '^12.140.0';

const findCdkWorker = (astRoot: SgNode): SgNode | null =>
  astRoot.find({
    rule: {
      kind: 'new_expression',
      regex: '^new (aws_lambda_nodejs.NodejsFunction|NodejsFunction)',
    },
  });

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

  if (!redirectHandler || redirectHandler.field('value')?.text() !== 'false') {
    return null;
  }

  const workerAst = findCdkWorker(astRoot);

  if (!workerAst) {
    return null;
  }

  const edits: Edit[] = [];
  removeDdTraceFromCdkNodeOptions(workerAst, edits);
  removeWholeLine(redirectHandler, edits);

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
  removeDdTraceFromServerlessNodeOptions(astRoot, edits);
  removeWholeLine(redirectHandlers, edits);

  if (!edits.length) {
    return null;
  }

  return astRoot.commitEdits(edits);
};

const removeDatadogNodeOptionsHackPatch: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const { tsFiles, serverlessFiles } = await collectLambdaFiles();

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
        if (!contents.includes('redirectHandlers')) {
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
      reason: 'no datadog lambda hack to remove',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  // `dd-trace` is intentionally left in place: it is still required to
  // instrument APM for Lambdas via `datadog-lambda-js` handler redirection, so
  // it must remain installed and bundled. Only the redundant `NODE_OPTIONS`
  // preload and `redirectHandler(s): false` setting are removed here.
  await Promise.all(
    patchedFiles.map(({ file, contents }) =>
      fs.promises.writeFile(file, contents, 'utf8'),
    ),
  );

  await upgradeInfraPackages(mode, [
    {
      name: 'datadog-lambda-js',
      version: await latest('datadog-lambda-js', {
        version: DATADOG_LAMBDA_JS_VERSION,
      }),
    },
  ]);

  return {
    result: 'apply',
  };
};

export const tryRemoveDatadogNodeOptionsHack: PatchFunction = async (
  config,
) => {
  try {
    return await removeDatadogNodeOptionsHackPatch(config);
  } catch (err) {
    log.warn('Failed to remove the dd-trace NODE_OPTIONS Lambda hack');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
