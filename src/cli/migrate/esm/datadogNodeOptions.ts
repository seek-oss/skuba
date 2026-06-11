import type { Edit, SgNode } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

export const DD_TRACE_INITIALIZE = '--import dd-trace/initialize.mjs';

const isQuotedScalar = (text: string): boolean =>
  (text.startsWith("'") && text.endsWith("'")) ||
  (text.startsWith('"') && text.endsWith('"'));

const childIndent = (block: SgNode, fallback: number): number => {
  const firstPair = block.find({ rule: { kind: 'block_mapping_pair' } });
  return firstPair ? firstPair.range().start.column : fallback;
};

export const appendDdTraceToCdkNodeOptions = (
  workerAst: SgNode,
  edits: Edit[],
) => {
  const environmentObject = workerAst.find({
    rule: {
      kind: 'object',
      inside: {
        kind: 'pair',
        regex: '^environment:',
      },
    },
  });

  if (!environmentObject) {
    return;
  }

  const nodeOptions = environmentObject.find({
    rule: {
      kind: 'pair',
      regex: '^NODE_OPTIONS:',
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

  const valueText = nodeOptionsValue.text();

  if (!isQuotedScalar(valueText)) {
    return;
  }

  const isEmpty = valueText.length === 2;
  edits.push({
    startPos: nodeOptionsValue.range().end.index - 1,
    endPos: nodeOptionsValue.range().end.index - 1,
    insertedText: `${isEmpty ? '' : ' '}${DD_TRACE_INITIALIZE}`,
  });
};

export const appendDdTraceToServerlessNodeOptions = (
  astRoot: SgNode,
  edits: Edit[],
) => {
  const nodeOptionsPairs = astRoot.findAll({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^NODE_OPTIONS:',
    },
  });

  if (nodeOptionsPairs.length) {
    for (const nodeOptions of nodeOptionsPairs) {
      const value = nodeOptions.field('value');

      if (!value || value.text().includes(DD_TRACE_INITIALIZE)) {
        continue;
      }

      const insertPos = isQuotedScalar(value.text())
        ? value.range().end.index - 1
        : value.range().end.index;

      edits.push({
        startPos: insertPos,
        endPos: insertPos,
        insertedText: ` ${DD_TRACE_INITIALIZE}`,
      });
    }
    return;
  }

  const provider = astRoot.find({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^provider:',
    },
  });

  const providerValue = provider?.field('value');

  if (!provider || !providerValue) {
    return;
  }

  const environment = providerValue.find({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^environment:',
    },
  });

  const environmentValue = environment?.field('value');

  if (environment && environmentValue) {
    const indent = childIndent(
      environmentValue,
      environment.range().start.column + 2,
    );
    edits.push({
      startPos: environmentValue.range().end.index,
      endPos: environmentValue.range().end.index,
      insertedText: `\n${' '.repeat(indent)}NODE_OPTIONS: '${DD_TRACE_INITIALIZE}'`,
    });
    return;
  }

  const indent = childIndent(providerValue, provider.range().start.column + 2);
  edits.push({
    startPos: providerValue.range().end.index,
    endPos: providerValue.range().end.index,
    insertedText: `\n${' '.repeat(indent)}environment:\n${' '.repeat(
      indent + 2,
    )}NODE_OPTIONS: '${DD_TRACE_INITIALIZE}'`,
  });
};

export interface LambdaFile {
  file: string;
  contents: string;
}

export interface LambdaFiles {
  tsFiles: LambdaFile[];
  serverlessFiles: LambdaFile[];
  containsDatadogLambdaImport: boolean;
}

export const collectLambdaFiles = async (): Promise<LambdaFiles> => {
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

  return { tsFiles, serverlessFiles, containsDatadogLambdaImport };
};
