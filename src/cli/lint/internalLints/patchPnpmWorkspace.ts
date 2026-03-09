import { inspect } from 'util';

import { type Edit, type SgNode, parse } from '@ast-grep/napi';
import fs from 'fs-extra';

import { log } from '../../../utils/logging.js';
import type { InternalLintResult } from '../internal.js';

import { registerAstGrepLanguages } from './registerAstGrepLanguages.js';

import { defaultConfig } from 'pnpm-plugin-skuba';

const isSimpleValue = (value: unknown) =>
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'string';

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

const getLastNode = (node: SgNode): SgNode => {
  let lastNode = node;
  while (true) {
    const nextNode = lastNode.next();
    if (!nextNode) {
      return lastNode;
    }
    lastNode = nextNode;
  }
};

export const patchPnpmWorkspace = async (
  mode: 'format' | 'lint',
): Promise<InternalLintResult> => {
  let pnpmWorkspaceFile: string;
  try {
    pnpmWorkspaceFile = await fs.promises.readFile(
      'pnpm-workspace.yaml',
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

  const ast = parse('yaml', pnpmWorkspaceFile);

  // if blockExoticSubdeps is not set to true, add an edit

  const edits: Edit[] = [];

  Object.entries(defaultConfig).forEach(([key, value]) => {
    const node = ast.root().find({
      rule: {
        pattern: {
          context: `${key}:`,
          selector: 'block_mapping_pair',
        },
      },
    });

    if (!node) {
      const endPos = ast.root().range().end.index;
      edits.push({
        startPos: endPos,
        endPos,
        insertedText: `\n${mapConfigToYamlValue(key, value)}`,
      });
    } else if (isSimpleValue(value)) {
      const yamlValue =
        typeof value === 'string' ? quoteYamlStringValue(value) : value;
      const managedText = `${key}: ${yamlValue} # Managed by skuba`;
      // The comment is a sibling node, not part of the block_mapping_pair.
      // Use its end index as the boundary; fall back to the node's own end.
      const nextSib = node.next();
      const commentNode = nextSib?.kind() === 'comment' ? nextSib : null;
      const endIdx = commentNode?.range().end.index ?? node.range().end.index;
      const lineText = pnpmWorkspaceFile.substring(
        node.range().start.index,
        endIdx,
      );
      if (lineText !== managedText) {
        edits.push({
          startPos: node.range().start.index,
          endPos: endIdx,
          insertedText: managedText,
        });
      }
    } else if (Array.isArray(value)) {
      const seqItems = node.findAll({ rule: { kind: 'block_sequence_item' } });

      const missingValues = value
        .map((v) => {
          const quotedV = quoteYamlStringValue(v);
          const seqItem = seqItems.find((item) => {
            const text = item.text();
            return (
              text.startsWith(`- ${v}`) ||
              text.startsWith(`- '${v}'`) ||
              text.startsWith(`- "${v}"`)
            );
          });

          if (!seqItem) {
            return v;
          }

          const nextSib = seqItem.next();
          const commentNode = nextSib?.kind() === 'comment' ? nextSib : null;
          const endIdx =
            commentNode?.range().end.index ?? seqItem.range().end.index;
          const lineText = pnpmWorkspaceFile.substring(
            seqItem.range().start.index,
            endIdx,
          );

          const expectedLineText = `- ${quotedV} # Managed by skuba`;
          if (lineText !== expectedLineText) {
            edits.push({
              startPos: seqItem.range().start.index,
              endPos: endIdx,
              insertedText: expectedLineText,
            });
          }
          return;
        })
        .filter((v) => v !== undefined);

      const itemsToAdd = missingValues
        .map((v) => `  - ${quoteYamlStringValue(v)} # Managed by skuba`)
        .join('\n');

      const lastItem = seqItems[seqItems.length - 1];

      if (itemsToAdd && lastItem) {
        const rangeNode = getLastNode(lastItem);

        edits.push({
          startPos: rangeNode.range().end.index,
          endPos: rangeNode.range().end.index,
          insertedText: `\n${itemsToAdd}`,
        });
      }
    } else {
      const mappingItems = node.findAll({
        rule: { kind: 'block_mapping_pair' },
      });

      const missingKeys = Object.entries(value)
        .map(([subKey, subValue]) => {
          const quotedSubKey = quoteYamlStringValue(subKey);
          const mappingItem = mappingItems.find((item) => {
            const text = item.text();
            return (
              text.startsWith(`${subKey}:`) ||
              text.startsWith(`'${subKey}':`) ||
              text.startsWith(`"${subKey}":`)
            );
          });

          if (!mappingItem) {
            return [subKey, subValue] as const;
          }

          const expectedText = `${quotedSubKey}: ${subValue} # Managed by skuba`;

          const nextSib = mappingItem.next();
          const commentNode = nextSib?.kind() === 'comment' ? nextSib : null;
          const itemEndIdx =
            commentNode?.range().end.index ?? mappingItem.range().end.index;
          const itemLineText = pnpmWorkspaceFile.substring(
            mappingItem.range().start.index,
            itemEndIdx,
          );
          if (itemLineText !== expectedText) {
            edits.push({
              startPos: mappingItem.range().start.index,
              endPos: itemEndIdx,
              insertedText: expectedText,
            });
          }
          return;
        })
        .filter((entry) => entry !== undefined);

      const itemsToAdd = missingKeys
        .map(
          ([subKey, subValue]) =>
            `  ${quoteYamlStringValue(subKey)}: ${subValue} # Managed by skuba`,
        )
        .join('\n');

      const lastItem = mappingItems[mappingItems.length - 1];

      if (itemsToAdd && lastItem) {
        const rangeNode = getLastNode(lastItem);

        edits.push({
          startPos: rangeNode.range().end.index,
          endPos: rangeNode.range().end.index,
          insertedText: `\n${itemsToAdd}`,
        });
      }
    }
  });

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

  await fs.promises.writeFile('pnpm-workspace.yaml', newSource, 'utf8');

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
    log.warn('Failed to patch Renovate config.');
    log.subtle(inspect(err));
    return { ok: false, fixable: false, annotations: [] };
  }
};
