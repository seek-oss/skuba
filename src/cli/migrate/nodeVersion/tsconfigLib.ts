import { type SgNode, parseAsync } from '@ast-grep/napi';

import { registerAstGrepLanguages } from '../../lint/internalLints/registerAstGrepLanguages.js';

export type LibChanges = {
  /**
   * Libs to append, e.g. `ESNext.Disposable`.
   *
   * These are skipped when the `lib` array already includes `ESNext` or a base
   * `ES<year>` lib that covers them.
   */
  add?: string[];

  /**
   * Libs to remove, e.g. an `ESNext.*` alias superseded by an `add` entry.
   */
  remove?: string[];
};

export type TsconfigLibOptions = LibChanges & { ECMAScriptVersion: string };

const BASE_LIB_REGEX = /^es(\d+)$/i;
const SUB_LIB_REGEX = /^es(\d+)\./i;

const toYear = (version: number) => {
  if (version >= 1000) {
    return version;
  }

  // ES6 is ES2015, ES7 is ES2016, etc.
  return version >= 6 ? version + 2009 : 2009;
};

const parseYear = (lib: string, regex: RegExp): number | undefined => {
  const match = regex.exec(lib);

  return match?.[1] ? toYear(Number(match[1])) : undefined;
};

const computeLibs = (
  libs: string[],
  { ECMAScriptVersion, add = [], remove = [] }: TsconfigLibOptions,
): string[] => {
  const targetYear = parseYear(ECMAScriptVersion, BASE_LIB_REGEX);

  const bumped = libs.map((lib) => {
    const year = parseYear(lib, BASE_LIB_REGEX);

    return year !== undefined && targetYear !== undefined && year < targetYear
      ? ECMAScriptVersion
      : lib;
  });

  const baseYear = Math.max(
    -Infinity,
    ...bumped.flatMap((lib) => parseYear(lib, BASE_LIB_REGEX) ?? []),
  );

  const isCovered = (lib: string) => {
    const year = parseYear(lib, SUB_LIB_REGEX);

    return year !== undefined && year <= baseYear;
  };

  const removals = new Set(remove.map((lib) => lib.toLowerCase()));

  const kept = bumped.filter(
    (lib) => !isCovered(lib) && !removals.has(lib.toLowerCase()),
  );

  const hasESNext = kept.some((lib) => lib.toLowerCase() === 'esnext');

  const additions = hasESNext ? [] : add.filter((lib) => !isCovered(lib));

  const seen = new Set<string>();

  return [...kept, ...additions].filter((lib) => {
    const key = lib.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const formatArray = (
  contents: string,
  array: SgNode,
  elements: SgNode[],
  libs: string[],
) => {
  if (libs.length === 0) {
    return '[]';
  }

  const items = libs.map((lib) => JSON.stringify(lib));

  const first = elements[0];
  const last = elements.at(-1);
  const { start, end } = array.range();

  if (!first || !last) {
    return `[${items.join(', ')}]`;
  }

  const prefix = contents.slice(start.index + 1, first.range().start.index);
  const suffix = contents.slice(last.range().end.index, end.index - 1);

  const second = elements[1];

  let separator: string;
  if (second) {
    separator = contents.slice(
      first.range().end.index,
      second.range().start.index,
    );
  } else if (prefix.includes('\n')) {
    separator = `,${prefix}`;
  } else {
    separator = ', ';
  }

  return `[${prefix}${items.join(separator)}${suffix}]`;
};

/**
 * Upgrades `compilerOptions.lib` in a `tsconfig.json`:
 *
 * 1. Bumps base `ES<year>` libs below `ECMAScriptVersion`
 * 2. Drops `ES<year>.*` sub-libs that a base lib in the array already covers
 * 3. Drops libs listed in `remove`
 * 4. Appends libs listed in `add`
 *
 * Returns the original contents if there is nothing to change, or if the `lib`
 * array cannot be safely rewritten (e.g. it contains comments).
 */
export const patchTsconfigLib = async (
  contents: string,
  options: TsconfigLibOptions,
): Promise<string> => {
  registerAstGrepLanguages();

  const root = (await parseAsync('json', contents)).root();

  const libPair = root.find({
    rule: {
      kind: 'pair',
      has: { field: 'key', regex: '^"lib"$' },
      inside: {
        kind: 'object',
        inside: {
          kind: 'pair',
          has: { field: 'key', regex: '^"compilerOptions"$' },
        },
      },
    },
  });

  const array = libPair?.field('value');

  if (array?.kind() !== 'array') {
    return contents;
  }

  const children = array.children().filter((child) => child.isNamed());

  if (children.length === 0 || children.some((c) => c.kind() !== 'string')) {
    return contents;
  }

  const libs = children.map((child) => JSON.parse(child.text()) as string);

  const newLibs = computeLibs(libs, options);

  const toKey = (values: string[]) =>
    values.map((value) => value.toLowerCase()).join('\0');

  if (toKey(newLibs) === toKey(libs)) {
    return contents;
  }

  return root.commitEdits([
    array.replace(formatArray(contents, array, children, newLibs)),
  ]);
};
