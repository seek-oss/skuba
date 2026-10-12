import path from 'path';
import { inspect, isDeepStrictEqual } from 'util';

import { Git } from '@skuba-lib/api';
import fs from 'fs-extra';
import { defaultConfigs } from 'pnpm-plugin-skuba';
import {
  type Document,
  type Node,
  Pair,
  type Scalar,
  YAMLMap,
  YAMLSeq,
  isCollection,
  isMap,
  isNode,
  isPair,
  isScalar,
  isSeq,
  parseDocument,
  visit,
} from 'yaml';

import { createExec } from '../../../utils/exec.js';
import { log } from '../../../utils/logging.js';
import { detectPackageManager } from '../../../utils/packageManager.js';
import { detectPnpmMajorVersion } from '../../../utils/pnpmVersion.js';
import type { InternalLintResult } from '../internal.js';

const lockFileUpdateTriggers = ['overrides'];

const MANAGED_COMMENT = ' Managed by skuba';

type SimpleValue = boolean | number | string;

type UnknownPair = Pair<unknown, unknown>;

type ManagedConfig = Record<
  string,
  boolean | number | string | string[] | Record<string, boolean>
>;

const resolveManagedConfig = async (
  dir: string,
): Promise<ManagedConfig | undefined> => {
  const major = await detectPnpmMajorVersion(dir);

  if (major === undefined || !(major in defaultConfigs)) {
    return undefined;
  }

  return defaultConfigs[major as keyof typeof defaultConfigs];
};

const isSimpleValue = (value: unknown): value is SimpleValue =>
  typeof value === 'boolean' ||
  typeof value === 'number' ||
  typeof value === 'string';

const compareCodeUnits = (a: string, b: string) => {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
};

const isManagedCommentLine = (line: string) =>
  line.trim() === MANAGED_COMMENT.trim();

const isManaged = (node: unknown): boolean =>
  isScalar(node) &&
  typeof node.comment === 'string' &&
  node.comment.split('\n').some(isManagedCommentLine);

const stripManagedCommentLines = (
  comment: string | null | undefined,
): string | undefined => {
  if (!comment) {
    return undefined;
  }

  const lines = comment
    .split('\n')
    .filter((line) => !isManagedCommentLine(line));

  return lines.some((line) => line.trim()) ? lines.join('\n') : undefined;
};

const keyOf = (pair: UnknownPair): string =>
  String(isScalar(pair.key) ? pair.key.value : pair.key);

const markManaged = (node: Scalar): Scalar => {
  node.comment = MANAGED_COMMENT;
  node.spaceBefore = undefined;
  return node;
};

const createManagedScalar = (doc: Document, value: SimpleValue): Scalar =>
  markManaged(doc.createNode(value));

const stripOrphanedManagedComments = (doc: Document) => {
  doc.commentBefore = stripManagedCommentLines(doc.commentBefore) ?? null;
  doc.comment = stripManagedCommentLines(doc.comment) ?? null;

  visit(doc, {
    Node: (_, node) => {
      node.commentBefore = stripManagedCommentLines(node.commentBefore);

      if (isCollection(node)) {
        node.comment = stripManagedCommentLines(node.comment);
      }
    },
  });
};

/**
 * The `yaml` parser attaches a comment above the first item of a block
 * collection to the collection itself. Move it to the item so it follows the
 * item when the collection is reordered.
 */
const moveLeadingCommentToFirstItem = (
  collection: YAMLMap<unknown, unknown> | YAMLSeq<unknown>,
) => {
  const [first] = collection.items;
  const target = isPair(first) ? first.key : first;

  if (!collection.commentBefore || !isNode(target)) {
    return;
  }

  target.commentBefore = [collection.commentBefore, target.commentBefore]
    .filter(Boolean)
    .join('\n');
  collection.commentBefore = undefined;
};

const isManagedItem = (item: unknown) =>
  isPair(item) ? isManaged(item.value) : isManaged(item);

const pruneUnmanagedSections = (
  root: YAMLMap<unknown, unknown>,
  defaultConfig: ManagedConfig,
) => {
  root.items = root.items.filter((pair) => {
    if (Object.hasOwn(defaultConfig, keyOf(pair))) {
      return true;
    }

    const value = pair.value;

    if (isScalar(value)) {
      return !isManaged(value);
    }

    if (isCollection(value)) {
      const items = (value.items as unknown[]).filter(
        (item) => !isManagedItem(item),
      );

      if (items.length === value.items.length) {
        return true;
      }

      value.items = items;

      return items.length > 0;
    }

    return true;
  });
};

const syncSimpleValue = (
  doc: Document,
  root: YAMLMap<unknown, unknown>,
  key: string,
  value: SimpleValue,
) => {
  const existing = root.items.find((pair) => keyOf(pair) === key);

  if (!existing) {
    root.items.push(
      new Pair(doc.createNode(key), createManagedScalar(doc, value)),
    );
    return;
  }

  existing.value =
    isScalar(existing.value) && existing.value.value === value
      ? markManaged(existing.value)
      : createManagedScalar(doc, value);
};

const syncArrayValue = (
  doc: Document,
  root: YAMLMap<unknown, unknown>,
  key: string,
  values: string[],
) => {
  const existing = root.items.find((pair) => keyOf(pair) === key);

  const seq = isSeq(existing?.value) ? existing.value : new YAMLSeq();
  seq.flow = false;
  moveLeadingCommentToFirstItem(seq);

  if (!existing) {
    root.items.push(new Pair(doc.createNode(key), seq));
  } else {
    existing.value = seq;
  }

  const managedValues = new Set(values);
  const existingManagedItems = new Map<string, Scalar>();
  const userItems: unknown[] = [];

  for (const item of seq.items) {
    const isManagedValue =
      isScalar(item) && managedValues.has(String(item.value));

    if (isManagedValue && !existingManagedItems.has(String(item.value))) {
      existingManagedItems.set(String(item.value), item);
    } else if (!isManagedValue && !isManaged(item)) {
      userItems.push(item);
    }
  }

  const managedItems = values.toSorted(compareCodeUnits).map((value) => {
    const existingItem = existingManagedItems.get(value);
    return existingItem
      ? markManaged(existingItem)
      : createManagedScalar(doc, value);
  });

  seq.items = [...managedItems, ...userItems];
};

const syncObjectValue = (
  doc: Document,
  root: YAMLMap<unknown, unknown>,
  key: string,
  value: Record<string, SimpleValue>,
) => {
  const existing = root.items.find((pair) => keyOf(pair) === key);

  const map: YAMLMap<unknown, unknown> = isMap(existing?.value)
    ? existing.value
    : new YAMLMap();
  map.flow = false;
  moveLeadingCommentToFirstItem(map);

  if (!existing) {
    root.items.push(new Pair(doc.createNode(key), map));
  } else {
    existing.value = map;
  }

  const existingManagedPairs = new Map<string, UnknownPair>();
  const userPairs: UnknownPair[] = [];

  for (const pair of map.items) {
    const pairKey = keyOf(pair);
    if (Object.hasOwn(value, pairKey)) {
      if (!existingManagedPairs.has(pairKey)) {
        existingManagedPairs.set(pairKey, pair);
      }
    } else if (!isManaged(pair.value)) {
      userPairs.push(pair);
    }
  }

  const managedPairs = Object.keys(value)
    .toSorted(compareCodeUnits)
    .map((pairKey) => {
      const pairValue = value[pairKey] as SimpleValue;
      const existingPair = existingManagedPairs.get(pairKey);

      if (!existingPair) {
        return new Pair(
          doc.createNode(pairKey),
          createManagedScalar(doc, pairValue),
        );
      }

      if (isScalar(existingPair.key)) {
        existingPair.key.spaceBefore = undefined;
      }

      existingPair.value =
        isScalar(existingPair.value) && existingPair.value.value === pairValue
          ? markManaged(existingPair.value)
          : createManagedScalar(doc, pairValue);

      return existingPair;
    });

  map.items = [...managedPairs, ...userPairs];
};

const toJs = (node: unknown): unknown =>
  node && typeof node === 'object' && 'toJSON' in node
    ? (node as Node).toJSON()
    : node;

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

  let pnpmWorkspaceFile;
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

  const defaultConfig = await resolveManagedConfig(dir);

  if (!defaultConfig) {
    log.warn(
      'Could not determine which pnpm version this project targets; skipping pnpm-workspace.yaml.',
    );
    return {
      ok: true,
      fixable: false,
      annotations: [],
    };
  }

  const doc: Document = parseDocument(pnpmWorkspaceFile);

  if (doc.errors.length) {
    throw new Error(
      `Failed to parse pnpm-workspace.yaml: ${doc.errors.map((err) => err.message).join('\n')}`,
    );
  }

  const originalTriggers = lockFileUpdateTriggers.map((trigger) =>
    toJs(doc.get(trigger)),
  );

  if (
    doc.contents === null ||
    (isScalar(doc.contents) && doc.contents.value === null)
  ) {
    doc.contents = new YAMLMap();
  }

  const contents = doc.contents;

  if (!isMap(contents)) {
    throw new Error('pnpm-workspace.yaml must contain a mapping');
  }

  stripOrphanedManagedComments(doc);
  pruneUnmanagedSections(contents, defaultConfig);

  for (const [key, value] of Object.entries(defaultConfig)) {
    if (isSimpleValue(value)) {
      syncSimpleValue(doc, contents, key, value);
    } else if (Array.isArray(value)) {
      syncArrayValue(doc, contents, key, value);
    } else {
      syncObjectValue(doc, contents, key, value);
    }
  }

  const finalSource = doc.toString({ lineWidth: 0, singleQuote: true });

  if (finalSource === pnpmWorkspaceFile) {
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

  await fs.promises.writeFile(
    path.join(dir, 'pnpm-workspace.yaml'),
    finalSource,
    'utf8',
  );

  const hasChanged = lockFileUpdateTriggers.some(
    (trigger, index) =>
      !isDeepStrictEqual(originalTriggers[index], toJs(doc.get(trigger))),
  );

  if (hasChanged) {
    log.subtle(
      'pnpm-workspace.yaml was updated, running `pnpm install` to update lockfile...',
    );
    await createExec({ cwd: dir })(
      'pnpm',
      'install',
      '--no-frozen-lockfile',
      '--prefer-offline',
    );
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
