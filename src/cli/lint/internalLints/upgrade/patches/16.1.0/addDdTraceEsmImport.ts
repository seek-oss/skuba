import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const DD_TRACE_INITIALIZE = '--import dd-trace/initialize.mjs';

const appendDdTraceToCdkNodeOptions = (workerAst: SgNode, edits: Edit[]) => {
  const environmentObject = workerAst.find({
    rule: {
      kind: 'object',
      inside: {
        kind: 'pair',
        regex: '^environment',
      },
    },
  });

  if (!environmentObject) {
    return;
  }

  const nodeOptions = environmentObject.find({
    rule: {
      kind: 'pair',
      regex: '^NODE_OPTIONS',
    },
  });

  if (!nodeOptions) {
    edits.push({
      startPos: environmentObject.range().end.index - 1,
      endPos: environmentObject.range().end.index - 1,
      insertedText: `\nNODE_OPTIONS: '${DD_TRACE_INITIALIZE}',\n`,
    });
    return;
  }

  const nodeOptionsValue = nodeOptions.field('value');

  if (
    !nodeOptionsValue ||
    nodeOptionsValue.text().includes(DD_TRACE_INITIALIZE)
  ) {
    return;
  }

  const needsSpace = nodeOptionsValue.text().length > 2;
  edits.push({
    startPos: nodeOptionsValue.range().end.index - 1,
    endPos: nodeOptionsValue.range().end.index - 1,
    insertedText: `${needsSpace ? ' ' : ''}${DD_TRACE_INITIALIZE}`,
  });
};

const appendDdTraceToServerlessNodeOptions = (
  astRoot: SgNode,
  edits: Edit[],
) => {
  const nodeOptions = astRoot.find({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^NODE_OPTIONS:',
    },
  });

  const value = nodeOptions?.field('value');

  if (!value || value.text().includes(DD_TRACE_INITIALIZE)) {
    return;
  }

  const valueText = value.text();
  const isQuoted =
    (valueText.startsWith("'") && valueText.endsWith("'")) ||
    (valueText.startsWith('"') && valueText.endsWith('"'));

  const insertPos = isQuoted
    ? value.range().end.index - 1
    : value.range().end.index;

  edits.push({
    startPos: insertPos,
    endPos: insertPos,
    insertedText: ` ${DD_TRACE_INITIALIZE}`,
  });
};

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

  const nodeModulesText =
    workerAst
      .find({
        rule: {
          kind: 'object',
          inside: { kind: 'pair', regex: '^bundling' },
        },
      })
      ?.find({ rule: { kind: 'pair', regex: '^nodeModules' } })
      ?.text() ?? '';

  const hasDatadogModules =
    nodeModulesText.includes('datadog-lambda-js') &&
    nodeModulesText.includes('dd-trace');

  if (!hasDatadogModules) {
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
  const [tsFilePaths, serverlessFilePaths] = await Promise.all([
    fg(['**/*.ts'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
    fg(['**/serverless*.{yml,yaml}'], {
      ignore: ['**/.git', '**/node_modules'],
    }),
  ]);

  const [tsFiles, serverlessFiles] = await Promise.all([
    Promise.all(
      tsFilePaths.map(async (file) => ({
        file,
        contents: await fs.promises.readFile(file, 'utf8'),
      })),
    ),
    Promise.all(
      serverlessFilePaths.map(async (file) => ({
        file,
        contents: await fs.promises.readFile(file, 'utf8'),
      })),
    ),
  ]);

  const containsDatadogLambdaImport = tsFiles.some(
    ({ contents }) =>
      contents.includes('datadog-lambda-js') ||
      contents.includes('withLambdaExtension'),
  );

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
