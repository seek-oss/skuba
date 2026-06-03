import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';

import { createExec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import type { InternalLintResult } from '../internal.js';

import { registerAstGrepLanguages } from './registerAstGrepLanguages.js';

import { Git } from '@skuba-lib/api';
import { defaultConfig } from 'pnpm-plugin-skuba';

const lockFileUpdateTriggers = ['overrides'];

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

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wrapOptionalQuotesRegex = (value: string): string =>
  `['"]?(${value})['"]?`;

const removeOptionalQuotes = (value: string): string =>
  value.replace(/^(['"])(.*)\1$/s, '$2');

const buildManagedCommentEdits = (
  node: SgNode,
  insertedText: string,
  matchRegex: RegExp,
  source: string,
): Edit[] => {
  const nodeRange = node.range();
  const maybeManagedComment = node.next();

  if (maybeManagedComment?.kind() !== 'comment') {
    return [
      {
        insertedText,
        startPos: nodeRange.start.index,
        endPos: nodeRange.end.index,
      },
    ];
  }

  const commentRange = maybeManagedComment.range();
  const content = source.slice(nodeRange.start.index, commentRange.end.index);
  if (matchRegex.test(content)) {
    return [];
  }

  return [
    {
      insertedText,
      startPos: nodeRange.start.index,
      endPos: commentRange.end.index,
    },
  ];
};

const applyDeleteEdits = async (
  source: string,
  astRoot: SgNode,
): Promise<{
  updatedSource: string;
  updatedAstRoot: SgNode;
}> => {
  const {
    simpleValues = [],
    arrayValues = [],
    objectValues = [],
  } = Object.groupBy(Object.entries(defaultConfig), ([, value]) => {
    if (isSimpleValue(value)) {
      return 'simpleValues';
    }
    if (Array.isArray(value)) {
      return 'arrayValues';
    }
    return 'objectValues';
  }) as {
    simpleValues: Array<[string, string | boolean | number]>;
    arrayValues: Array<[string, string[]]>;
    objectValues: Array<[string, Record<string, boolean>]>;
  };

  const nodesToDelete = astRoot.findAll({
    rule: {
      any: [
        {
          kind: 'block_mapping_pair',
          precedes: {
            kind: 'comment',
            regex: '# Managed by skuba',
          },
          has: {
            kind: 'flow_node',
            field: 'key',
            not: {
              regex: `^${wrapOptionalQuotesRegex(simpleValues.map(([key]) => escapeRegex(key)).join('|'))}$`,
            },
          },
          inside: {
            kind: 'block_mapping',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'document',
              },
            },
          },
        },
        ...arrayValues.map(([key, value]) => ({
          kind: 'block_sequence_item',
          precedes: {
            kind: 'comment',
            regex: '# Managed by skuba',
          },
          has: {
            kind: 'flow_node',
            not: {
              regex: `^${wrapOptionalQuotesRegex(value.map((v) => escapeRegex(v)).join('|'))}$`,
            },
          },
          inside: {
            kind: 'block_sequence',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'block_mapping_pair',
                has: {
                  kind: 'flow_node',
                  field: 'key',
                  regex: `^${wrapOptionalQuotesRegex(escapeRegex(key))}$`,
                },
              },
            },
          },
        })),
        {
          kind: 'block_sequence_item',
          precedes: {
            kind: 'comment',
            regex: '# Managed by skuba',
          },
          has: {
            kind: 'flow_node',
          },
          inside: {
            kind: 'block_sequence',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'block_mapping_pair',
                has: {
                  kind: 'flow_node',
                  field: 'key',
                  not: {
                    regex: `^${wrapOptionalQuotesRegex(arrayValues.map(([key]) => escapeRegex(key)).join('|'))}$`,
                  },
                },
              },
            },
          },
        },
        ...objectValues.map(([key, value]) => ({
          kind: 'block_mapping_pair',
          has: {
            kind: 'flow_node',
            field: 'key',
            not: {
              regex: `^${wrapOptionalQuotesRegex(Object.keys(value).map(escapeRegex).join('|'))}$`,
            },
          },
          precedes: {
            kind: 'comment',
            regex: '^# Managed by skuba$',
          },
          inside: {
            kind: 'block_mapping',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'block_mapping_pair',
                has: {
                  kind: 'flow_node',
                  field: 'key',
                  regex: `^${wrapOptionalQuotesRegex(escapeRegex(key))}$`,
                },
              },
            },
          },
        })),
        {
          kind: 'block_mapping_pair',
          has: {
            kind: 'flow_node',
            field: 'key',
          },
          precedes: {
            kind: 'comment',
            regex: '^# Managed by skuba$',
          },
          inside: {
            kind: 'block_mapping',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'block_mapping_pair',
                has: {
                  kind: 'flow_node',
                  field: 'key',
                  not: {
                    regex: `^${wrapOptionalQuotesRegex(objectValues.map(([key]) => escapeRegex(key)).join('|'))}$`,
                  },
                },
              },
            },
          },
        },
      ],
    },
  });

  const commentNodes = astRoot.findAll({
    rule: {
      kind: 'comment',
      regex: '^# Managed by skuba$',
      any: [
        {
          inside: {
            kind: 'block_mapping_pair',
            inside: {
              kind: 'block_mapping',
              inside: {
                kind: 'block_node',
                inside: {
                  kind: 'document',
                },
              },
            },
          },
        },
        {
          follows: {
            kind: 'comment',
          },
        },
      ],
    },
  });

  const deleteCommentEdits = commentNodes
    .map((node) => {
      const previousNode = node.prev();
      const nodeRange = node.range();

      // This can match against valid nodes as we can't check line numbers in the AST
      if (previousNode?.range().start.line === nodeRange.start.line) {
        return undefined;
      }

      const endPos =
        source.at(nodeRange.end.index) === '\n'
          ? nodeRange.end.index + 1
          : nodeRange.end.index;

      return {
        startPos: nodeRange.start.index - nodeRange.start.column,
        endPos,
        insertedText: '',
      };
    })
    .filter((edit) => edit !== undefined);

  if (!nodesToDelete.length && !deleteCommentEdits.length) {
    return {
      updatedSource: source,
      updatedAstRoot: astRoot,
    };
  }

  const deleteEdits = nodesToDelete.map((node) => {
    const nodeRange = node.range();

    const column = nodeRange.start.column;
    // delete the whole line including any characters before the column, eg. whitespace or list operators
    const startPos = nodeRange.start.index - column;

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the node has a next sibling
    const commentNode = node.next()!;
    const commentNodeRange = commentNode.range();
    const commentNodeEndIndex = commentNodeRange.end.index;
    const endPos =
      source.at(commentNodeEndIndex) === '\n'
        ? commentNodeEndIndex + 1
        : commentNodeEndIndex;

    if (commentNodeRange.start.line !== nodeRange.start.line) {
      return {
        insertedText: '',
        startPos: commentNodeRange.start.index - commentNodeRange.start.column,
        endPos,
      };
    }

    return {
      insertedText: '',
      startPos,
      endPos,
    };
  });

  const updatedSource = astRoot.commitEdits([
    ...deleteEdits,
    ...deleteCommentEdits,
  ]);
  const updatedAstRoot = (await parseAsync('yaml', updatedSource)).root();

  // check if there are any orphaned sections
  // eg. section is now empty after deleting the last array item or object key
  const orphanedSections = updatedAstRoot.findAll({
    rule: {
      any: [
        {
          kind: 'block_mapping_pair',
          inside: {
            kind: 'block_mapping',
            inside: {
              kind: 'block_node',
              inside: {
                kind: 'document',
              },
            },
          },
          all: [
            {
              not: {
                has: {
                  kind: 'flow_node',
                  field: 'value',
                },
              },
            },
            {
              not: {
                has: {
                  kind: 'block_node',
                  field: 'value',
                },
              },
            },
          ],
        },
      ],
    },
  });

  if (!orphanedSections.length) {
    return {
      updatedSource,
      updatedAstRoot,
    };
  }

  const deleteSectionEdits = orphanedSections.map((node) => {
    const nodeRange = node.range();

    const column = nodeRange.start.column;
    const startPos = nodeRange.start.index - column;
    const endPos =
      updatedSource.at(nodeRange.end.index) === '\n'
        ? nodeRange.end.index + 1
        : nodeRange.end.index;

    return {
      insertedText: '',
      startPos,
      endPos,
    };
  });

  const prunedSource = updatedAstRoot.commitEdits(deleteSectionEdits);
  const prunedAstRoot = (await parseAsync('yaml', prunedSource)).root();

  return {
    updatedSource: prunedSource,
    updatedAstRoot: prunedAstRoot,
  };
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
  const astRoot = (await parseAsync('yaml', pnpmWorkspaceFile)).root();

  const { updatedSource, updatedAstRoot } = await applyDeleteEdits(
    pnpmWorkspaceFile,
    astRoot,
  );
  const startOfDocument = updatedAstRoot.range().start.index;

  const existingSections = updatedAstRoot.findAll({
    rule: {
      kind: 'block_mapping_pair',
      inside: {
        kind: 'block_mapping',
        inside: {
          kind: 'block_node',
          inside: {
            kind: 'document',
          },
        },
      },
      has: {
        kind: 'flow_node',
        field: 'key',
        regex: `^${wrapOptionalQuotesRegex(
          Object.keys(defaultConfig).map(escapeRegex).join('|'),
        )}$`,
      },
    },
  });

  const existingSectionsSet = new Set(
    existingSections.map((section) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the section has a key
      removeOptionalQuotes(section.field('key')!.text()),
    ),
  );

  const addSectionEdits = Object.entries(defaultConfig)
    .filter(([key]) => !existingSectionsSet.has(key))
    .map(([key, value]) => {
      if (isSimpleValue(value)) {
        return {
          insertedText: `${quoteYamlStringValue(key)}: ${value} # Managed by skuba\n`,
          startPos: startOfDocument,
          endPos: startOfDocument,
        };
      }

      if (Array.isArray(value)) {
        return {
          insertedText: `${quoteYamlStringValue(key)}:\n${value.map((v) => `  - ${quoteYamlStringValue(v)} # Managed by skuba\n`).join('')}`,
          startPos: startOfDocument,
          endPos: startOfDocument,
        };
      }

      return {
        insertedText: `${quoteYamlStringValue(key)}:\n${Object.entries(value)
          .map(
            ([k, v]) =>
              `  ${quoteYamlStringValue(k)}: ${v} # Managed by skuba\n`,
          )
          .join('')}`,
        startPos: startOfDocument,
        endPos: startOfDocument,
      };
    });

  const updateSectionEdits = existingSections
    .map((section) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the section has a key
      const rawKey = section.field('key')!.text();
      const key = removeOptionalQuotes(rawKey);
      const value = defaultConfig[key as keyof typeof defaultConfig];

      if (isSimpleValue(value)) {
        return buildManagedCommentEdits(
          section,
          `${rawKey}: ${value} # Managed by skuba`,
          new RegExp(
            `^${wrapOptionalQuotesRegex(escapeRegex(key))}: ${escapeRegex(String(value))} # Managed by skuba$`,
          ),
          updatedSource,
        );
      }

      if (Array.isArray(value)) {
        const existingItems = section.findAll({
          rule: {
            kind: 'block_sequence_item',
            has: {
              kind: 'flow_node',
              regex: `^${wrapOptionalQuotesRegex(value.map((v) => escapeRegex(v)).join('|'))}$`,
            },
          },
        });

        const existingItemsSet = new Set(
          existingItems.map((item) =>
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the item has a child
            removeOptionalQuotes(item.child(1)!.text()),
          ),
        );

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the section has a value
        const blockValue = section.field('value')!;
        const blockValueRange = blockValue.range();
        const blockStartPos =
          blockValueRange.start.index - blockValueRange.start.column;
        const newItemsEdits = value
          .filter((item) => !existingItemsSet.has(item))
          .map((item) => ({
            insertedText: `  - ${quoteYamlStringValue(item)} # Managed by skuba\n`,
            startPos: blockStartPos,
            endPos: blockStartPos,
          }));

        const existingItemsEdits = existingItems.flatMap((existingItem) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the item has a child
          const existingRawValue = existingItem.child(1)!.text();
          const existingValue = removeOptionalQuotes(existingRawValue);
          return buildManagedCommentEdits(
            existingItem,
            `- ${existingRawValue} # Managed by skuba`,
            new RegExp(
              `^- ${wrapOptionalQuotesRegex(escapeRegex(existingValue))} # Managed by skuba$`,
            ),
            updatedSource,
          );
        });

        return [...newItemsEdits, ...existingItemsEdits];
      }

      const existingObjectValues = section.findAll({
        rule: {
          kind: 'block_mapping_pair',
          has: {
            kind: 'flow_node',
            field: 'key',
            regex: `^${wrapOptionalQuotesRegex(Object.keys(value).map(escapeRegex).join('|'))}$`,
          },
        },
      });

      const existingObjectValuesSet = new Set(
        existingObjectValues.map((item) =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the item has a key
          removeOptionalQuotes(item.field('key')!.text()),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the section has a value
      const blockNodeValue = section.field('value')!;
      const blockValueRange = blockNodeValue.range();
      const blockStartPos =
        blockValueRange.start.index - blockValueRange.start.column;

      const newObjectValuesEdits = Object.entries(value)
        .filter(([objKey]) => !existingObjectValuesSet.has(objKey))
        .map(([objKey, objValue]) => ({
          insertedText: `  ${quoteYamlStringValue(objKey)}: ${objValue} # Managed by skuba\n`,
          startPos: blockStartPos,
          endPos: blockStartPos,
        }));

      const existingObjectValuesEdits = existingObjectValues.flatMap(
        (existingObjectValue) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know the item has a key
          const existingRawKey = existingObjectValue.field('key')!.text();
          const existingKey = removeOptionalQuotes(existingRawKey);
          const configValue = value[existingKey as keyof typeof value];
          return buildManagedCommentEdits(
            existingObjectValue,
            `${existingRawKey}: ${configValue as string | boolean | number} # Managed by skuba`,
            new RegExp(
              `^${wrapOptionalQuotesRegex(escapeRegex(existingKey))}: ${escapeRegex(String(configValue))} # Managed by skuba$`,
            ),
            updatedSource,
          );
        },
      );

      return [...newObjectValuesEdits, ...existingObjectValuesEdits];
    })
    .flat();

  if (
    !addSectionEdits.length &&
    !updateSectionEdits.length &&
    pnpmWorkspaceFile === updatedSource
  ) {
    return {
      ok: true,
      fixable: false,
      annotations: [],
    };
  }

  const finalSource = updatedAstRoot.commitEdits([
    ...addSectionEdits,
    ...updateSectionEdits,
  ]);

  if (mode === 'lint' && finalSource !== pnpmWorkspaceFile) {
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

  await fs.promises.writeFile(
    path.join(dir, 'pnpm-workspace.yaml'),
    finalSource,
    'utf8',
  );

  const finalAst = (await parseAsync('yaml', finalSource)).root();

  const hasChanged = lockFileUpdateTriggers.some((trigger) => {
    const finalSection = finalAst.find({
      rule: {
        kind: 'block_mapping_pair',
        has: {
          kind: 'flow_node',
          field: 'key',
          regex: `^${wrapOptionalQuotesRegex(escapeRegex(trigger))}$`,
        },
        inside: {
          kind: 'block_mapping',
          inside: {
            kind: 'block_node',
            inside: {
              kind: 'document',
            },
          },
        },
      },
    });

    const existingSection = astRoot.find({
      rule: {
        kind: 'block_mapping_pair',
        has: {
          kind: 'flow_node',
          field: 'key',
          regex: `^${wrapOptionalQuotesRegex(escapeRegex(trigger))}$`,
        },
        inside: {
          kind: 'block_mapping',
          inside: {
            kind: 'block_node',
            inside: {
              kind: 'document',
            },
          },
        },
      },
    });

    return existingSection?.text() !== finalSection?.text();
  });

  if (hasChanged) {
    log.subtle(
      'pnpm-workspace.yaml was updated, running `pnpm install` to update lockfile...',
    );
    await createExec({ cwd: dir })('pnpm', 'install', '--fix-lockfile', '--no-frozen-lockfile', '--ofline');
  }

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
