import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import type { InternalLintResult } from '../internal.js';

import { registerAstGrepLanguages } from './registerAstGrepLanguages.js';

import { Git } from '@skuba-lib/api';
import { defaultConfig } from 'pnpm-plugin-skuba';

const isSimpleValue = (value: unknown) =>
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'string';

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Quote strings that begin with YAML reserved indicator characters (@ and `)
const quoteYamlStringValue = (value: string): string => {
  if (/^[@`]/.test(value)) {
    return `'${value}'`;
  }
  return value;
};

const mapConfigToYamlValue = (
  key: string,
  value: (typeof defaultConfig)[keyof typeof defaultConfig],
): string => {
  if (isSimpleValue(value)) {
    const yamlValue =
      typeof value === 'string' ? quoteYamlStringValue(value) : value;
    return `${key}: ${yamlValue} # Managed by skuba`;
  }

  if (Array.isArray(value)) {
    return `${key}:\n${value.map((item) => `  - ${quoteYamlStringValue(item)} # Managed by skuba`).join('\n')}`;
  }

  return `${key}:\n${Object.entries(value)
    .map(
      ([subKey, subValue]) =>
        `  ${quoteYamlStringValue(subKey)}: ${subValue} # Managed by skuba`,
    )
    .join('\n')}`;
};

const findEndOfLine = (node: SgNode, pnpmWorkspaceFile: string): SgNode => {
  const maybeComment = node.next();
  if (
    node &&
    maybeComment?.kind() === 'comment' &&
    // Check if # Managed by skuba is on the same line as the block_mapping_pair. A comment on a new line and a comment on the same line both appear in the AST
    // as a comment node immediately following the block_mapping_pair, so we need to check the text to see if it's a comment for the line or a separate line.
    // eg. The following lines appear as [block_mapping_pair, comment, comment]
    // someLine: value # Managed by skuba
    // # Managed by skuba
    /^[^\n]*# Managed by skuba$/.test(
      pnpmWorkspaceFile.substring(
        node.range().start.index,
        maybeComment.range().end.index,
      ),
    )
  ) {
    return maybeComment;
  }

  return node;
};

export const patchPnpmWorkspace = async (
  mode: 'format' | 'lint',
  cwd: string = process.cwd(),
): Promise<InternalLintResult> => {
  const packageManager = await detectPackageManager();

  if (packageManager.command !== 'pnpm') {
    return {
      ok: true,
      fixable: false,
      annotations: [],
    };
  }
  const root = await Git.findRoot({ dir: cwd });
  const dir = root ?? cwd;

  let pnpmWorkspaceFile: string;
  try {
    pnpmWorkspaceFile = await fs.promises.readFile(
      path.join(dir, 'pnpm-workspace.yaml'),
      'utf8',
    );
  } catch {
    return {
      ok: true,
      fixable: false,
      annotations: [],
    };
  }

  registerAstGrepLanguages();

  const ast = await parseAsync('yaml', pnpmWorkspaceFile);
  const edits: Edit[] = [];

  const blockMapping = ast.root().find({ rule: { kind: 'block_mapping' } });

  const blockMappingPairs = blockMapping
    ?.children()
    .filter((child) => child.kind() === 'block_mapping_pair');

  blockMappingPairs?.forEach((pair) => {
    const key = pair.field('key')?.text();
    if (key && key in defaultConfig) {
      return;
    }

    const endOfLine = findEndOfLine(pair, pnpmWorkspaceFile);
    const value = pair.field('value');
    if (value && endOfLine.kind() === 'comment') {
      edits.push({
        startPos: pair.range().start.index,
        endPos: endOfLine.range().end.index + 1, // include the newline after the comment
        insertedText: '',
      });
    }
  });

  const newKeyTexts: string[] = [];

  Object.entries(defaultConfig).forEach(([key, value]) => {
    const node = blockMappingPairs?.find(
      (pair) => (pair.field('key')?.text() ?? '') === key,
    );

    if (!node) {
      newKeyTexts.push(mapConfigToYamlValue(key, value));
    } else if (isSimpleValue(value)) {
      const yamlValue =
        typeof value === 'string' ? quoteYamlStringValue(value) : value;
      const managedText = `${key}: ${yamlValue} # Managed by skuba`;

      const endOfLineIndex = findEndOfLine(node, pnpmWorkspaceFile).range().end
        .index;

      const lineText = pnpmWorkspaceFile.substring(
        node.range().start.index,
        endOfLineIndex,
      );
      if (lineText !== managedText) {
        edits.push({
          startPos: node.range().start.index,
          endPos: endOfLineIndex,
          insertedText: managedText,
        });
      }
    } else if (Array.isArray(value)) {
      const seqItems = node.findAll({ rule: { kind: 'block_sequence_item' } });

      seqItems.forEach((item) => {
        const itemValue = item
          .children()
          .find((child) => child.kind() === 'flow_node')
          ?.text()
          ?.replace(/^['"]|['"]$/g, '');

        if (!itemValue || value.includes(itemValue)) {
          return;
        }

        const endOfLine = findEndOfLine(item, pnpmWorkspaceFile);
        if (endOfLine.kind() === 'comment') {
          edits.push({
            startPos: item.range().start.index - 2, // include the two spaces before the dash
            endPos: endOfLine.range().end.index + 1, // include the newline after the comment
            insertedText: '',
          });
        }
      });

      const missingValues = value
        .map((v) => {
          const quotedV = quoteYamlStringValue(v);
          const seqItem = seqItems.find((item) =>
            new RegExp(`^- ${escapeRegExp(quotedV)}(?:\\s|$)`).test(
              item.text(),
            ),
          );

          if (!seqItem) {
            return v;
          }

          const endOfLineIndex = findEndOfLine(
            seqItem,
            pnpmWorkspaceFile,
          ).range().end.index;

          const lineText = pnpmWorkspaceFile.substring(
            seqItem.range().start.index,
            endOfLineIndex,
          );

          const expectedLineText = `- ${quotedV} # Managed by skuba`;
          if (lineText !== expectedLineText) {
            edits.push({
              startPos: seqItem.range().start.index,
              endPos: endOfLineIndex,
              insertedText: expectedLineText,
            });
          }
          return;
        })
        .filter((v) => v !== undefined);

      const itemsToAdd = missingValues
        .map((v) => `\n  - ${quoteYamlStringValue(v)} # Managed by skuba`)
        .join('');

      // eg. trustPolicyExclude
      const keyNode = node.field('key');

      if (itemsToAdd && keyNode) {
        const position = keyNode.range().end.index + 1; // colon

        edits.push({
          startPos: position,
          endPos: position,
          insertedText: `${itemsToAdd}`,
        });
      }
    } else {
      const valueNode = node.field('value') ?? node;
      const mappingItems = valueNode.findAll({
        rule: { kind: 'block_mapping_pair' },
      });

      mappingItems.forEach((item) => {
        const itemKey = item
          .field('key')
          ?.text()
          .replace(/^['"]|['"]$/g, '');

        if (!itemKey || itemKey in value) {
          return;
        }

        const endOfLine = findEndOfLine(item, pnpmWorkspaceFile);
        if (endOfLine.kind() === 'comment') {
          edits.push({
            startPos: item.range().start.index - 2, // include the two spaces before the key
            endPos: endOfLine.range().end.index + 1, // include the newline after the comment
            insertedText: '',
          });
        }
      });

      const missingKeys = Object.entries(value)
        .map(([subKey, subValue]) => {
          const quotedSubKey = quoteYamlStringValue(subKey);
          const mappingItem = mappingItems.find((item) =>
            new RegExp(`^${escapeRegExp(quotedSubKey)}:`).test(item.text()),
          );

          if (!mappingItem) {
            return [subKey, subValue] as const;
          }

          const expectedText = `${quotedSubKey}: ${subValue} # Managed by skuba`;
          const endOfLineIndex = findEndOfLine(
            mappingItem,
            pnpmWorkspaceFile,
          ).range().end.index;

          const itemLineText = pnpmWorkspaceFile.substring(
            mappingItem.range().start.index,
            endOfLineIndex,
          );
          if (itemLineText !== expectedText) {
            edits.push({
              startPos: mappingItem.range().start.index,
              endPos: endOfLineIndex,
              insertedText: expectedText,
            });
          }
          return;
        })
        .filter((entry) => entry !== undefined);

      const itemsToAdd = missingKeys
        .map(
          ([subKey, subValue]) =>
            `\n  ${quoteYamlStringValue(subKey)}: ${subValue} # Managed by skuba`,
        )
        .join('');

      // eg. allowBuilds
      const keyNode = node.field('key');

      if (itemsToAdd && keyNode) {
        const position = keyNode.range().end.index + 1; // colon
        edits.push({
          startPos: position,
          endPos: position,
          insertedText: `${itemsToAdd}`,
        });
      }
    }
  });

  if (newKeyTexts.length > 0) {
    edits.push({
      startPos: ast.root().range().start.index,
      endPos: ast.root().range().start.index,
      insertedText: `${newKeyTexts.join('\n')}\n`,
    });
  }

  if (edits.length === 0) {
    return {
      ok: true,
      fixable: false,
      annotations: [],
    };
  }

  if (mode === 'lint') {
    return {
      ok: false,
      fixable: true,
      annotations: [
        {
          message:
            'pnpm-workspace.yaml is out of date. Run `pnpm skuba format` to update it.',
          path: 'pnpm-workspace.yaml',
        },
      ],
    };
  }

  const newSource = ast.root().commitEdits(edits);

  await fs.promises.writeFile(
    path.join(dir, 'pnpm-workspace.yaml'),
    newSource,
    'utf8',
  );

  return {
    ok: true,
    fixable: false,
    annotations: [],
  };
};

export const tryPatchPnpmWorkspace = async (
  mode: 'format' | 'lint',
): Promise<InternalLintResult> => {
  try {
    return await patchPnpmWorkspace(mode);
  } catch (err) {
    log.warn('Failed to patch pnpm workspace.');
    log.subtle(inspect(err));
    return { ok: false, fixable: false, annotations: [] };
  }
};
