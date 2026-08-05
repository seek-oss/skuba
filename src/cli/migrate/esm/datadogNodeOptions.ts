import type { Edit, SgNode } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

export const DD_TRACE_INITIALIZE = '--import dd-trace/initialize.mjs';

const isQuotedScalar = (text: string): boolean =>
  (text.startsWith("'") && text.endsWith("'")) ||
  (text.startsWith('"') && text.endsWith('"'));

const stripDdTrace = (inner: string): string =>
  inner
    .replace(DD_TRACE_INITIALIZE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Removes a node's entire line, including its leading indentation, an optional
 * trailing comma, an optional trailing inline comment, and the trailing
 * newline.
 */
export const removeWholeLine = (node: SgNode, edits: Edit[]) => {
  const source = node.getRoot().root().text();
  const { start, end } = node.range();

  let startPos = start.index;
  while (startPos > 0 && source[startPos - 1] !== '\n') {
    startPos--;
  }

  let endPos = end.index;
  if (source[endPos] === ',') {
    endPos++;
  }

  // Consume trailing whitespace and an optional inline comment so we don't
  // orphan a `# ...` (YAML) or `// ...` (TS) comment that followed the value.
  let cursor = endPos;
  while (source[cursor] === ' ' || source[cursor] === '\t') {
    cursor++;
  }
  if (source[cursor] === '#' || source.startsWith('//', cursor)) {
    while (cursor < source.length && source[cursor] !== '\n') {
      cursor++;
    }
    endPos = cursor;
  }

  if (source[endPos] === '\n') {
    endPos++;
  }

  edits.push({ startPos, endPos, insertedText: '' });
};

export const removeDdTraceFromCdkNodeOptions = (
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

  const nodeOptions = environmentObject?.find({
    rule: {
      kind: 'pair',
      regex: '^NODE_OPTIONS:',
    },
  });

  const nodeOptionsValue = nodeOptions?.field('value');

  if (!nodeOptions || !nodeOptionsValue?.text().includes(DD_TRACE_INITIALIZE)) {
    return;
  }

  const valueText = nodeOptionsValue.text();

  if (!isQuotedScalar(valueText)) {
    return;
  }

  const quote = valueText[0];
  const newInner = stripDdTrace(valueText.slice(1, -1));

  if (newInner === '') {
    removeWholeLine(nodeOptions, edits);
    return;
  }

  edits.push(nodeOptionsValue.replace(`${quote}${newInner}${quote}`));
};

export const removeDdTraceFromServerlessNodeOptions = (
  astRoot: SgNode,
  edits: Edit[],
) => {
  const nodeOptionsPairs = astRoot.findAll({
    rule: {
      kind: 'block_mapping_pair',
      regex: '^NODE_OPTIONS:',
    },
  });

  for (const nodeOptions of nodeOptionsPairs) {
    const value = nodeOptions.field('value');

    if (!value?.text().includes(DD_TRACE_INITIALIZE)) {
      continue;
    }

    const valueText = value.text();
    const quoted = isQuotedScalar(valueText);
    const newInner = stripDdTrace(quoted ? valueText.slice(1, -1) : valueText);

    if (newInner === '') {
      removeWholeLine(nodeOptions, edits);
      continue;
    }

    edits.push(
      value.replace(
        quoted ? `${valueText[0]}${newInner}${valueText[0]}` : newInner,
      ),
    );
  }
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
