import path from 'path';

import { type SgNode, parseAsync } from '@ast-grep/napi';
import fs from 'fs-extra';
import picomatch from 'picomatch';

import { isErrorWithCode } from '../../utils/error.js';
import { registerAstGrepLanguages } from '../lint/internalLints/registerAstGrepLanguages.js';

interface RegisterWorkspaceProjectProps {
  workspaceRoot: string;
  projectDir: string;
}

export type RegisterWorkspaceResult =
  /** The project is already covered by an existing workspace glob. */
  | { outcome: 'already-covered'; entry: string }
  /** The project was registered by editing a workspace file. */
  | { outcome: 'registered'; entry: string; file: string }
  /** Registration could not be performed; the user must add it manually. */
  | { outcome: 'manual'; entry: string; reason: string };

const stripQuotes = (value: string): string =>
  value.replace(/^(['"])([\s\S]*)\1$/, '$2');

/**
 * Locates the value node of the top-level `packages:` mapping pair.
 *
 * `packages:` lists every workspace member (libraries and applications alike),
 * so this is where both a package and an app like a Lambda worker or API get
 * registered.
 */
const findPackagesValue = (astRoot: SgNode): SgNode | null => {
  const pair = astRoot.find({
    rule: {
      kind: 'block_mapping_pair',
      has: {
        kind: 'flow_node',
        field: 'key',
        regex: '^[\'"]?packages[\'"]?$',
      },
      inside: {
        kind: 'block_mapping',
        inside: { kind: 'block_node', inside: { kind: 'document' } },
      },
    },
  });

  return pair?.field('value') ?? null;
};

const readGlobs = (value: SgNode): string[] => {
  // An inline flow sequence, e.g. `packages: ['packages/*']`.
  const flowSequence = value.find({ rule: { kind: 'flow_sequence' } });
  if (flowSequence) {
    return flowSequence
      .children()
      .filter((child) => child.kind() === 'flow_node')
      .map((child) => stripQuotes(child.text()));
  }

  // A YAML block list, e.g. `packages:\n  - packages/*`.
  return value
    .findAll({ rule: { kind: 'block_sequence_item' } })
    .map((item) => item.find({ rule: { kind: 'flow_node' } })?.text())
    .filter((text): text is string => text !== undefined)
    .map(stripQuotes);
};

const isCovered = (globs: string[], rel: string): boolean =>
  // Negation globs (`!foo`) exclude rather than cover paths; picomatch would
  // otherwise treat them as matching everything.
  globs.some((glob) => !glob.startsWith('!') && picomatch(glob)(rel));

/**
 * Registers a project in the existing pnpm workspace so it installs against the
 * root lockfile.
 *
 * The `pnpm-workspace.yaml` document is edited through its ast-grep syntax tree
 * so that surrounding keys, comments and formatting are preserved; only the
 * `packages:` sequence is touched.
 *
 * A `manual` result (rather than a thrown error) is returned when
 * `pnpm-workspace.yaml` cannot be located or its `packages:` sequence cannot be
 * found, letting the caller print guidance instead of failing the init. This
 * also covers a non-pnpm root.
 */
export const registerWorkspaceProject = async ({
  workspaceRoot,
  projectDir,
}: RegisterWorkspaceProjectProps): Promise<RegisterWorkspaceResult> => {
  const rel = path
    .relative(workspaceRoot, projectDir)
    .split(path.sep)
    .join('/');

  if (!rel || rel.startsWith('..')) {
    return {
      outcome: 'manual',
      entry: rel,
      reason: 'the project is not inside the workspace root',
    };
  }

  const file = path.join(workspaceRoot, 'pnpm-workspace.yaml');

  let contents: string;
  try {
    contents = await fs.promises.readFile(file, 'utf8');
  } catch (err) {
    if (isErrorWithCode(err, 'ENOENT')) {
      return {
        outcome: 'manual',
        entry: rel,
        reason: 'no pnpm-workspace.yaml found at the workspace root',
      };
    }
    throw err;
  }

  registerAstGrepLanguages();
  const astRoot = (await parseAsync('yaml', contents)).root();

  const packagesValue = findPackagesValue(astRoot);
  if (!packagesValue) {
    return {
      outcome: 'manual',
      entry: rel,
      reason: 'could not find a packages: section in pnpm-workspace.yaml',
    };
  }

  const globs = readGlobs(packagesValue);
  if (isCovered(globs, rel)) {
    return { outcome: 'already-covered', entry: rel };
  }

  const flowSequence = packagesValue.find({ rule: { kind: 'flow_sequence' } });
  const blockSequence = packagesValue.find({
    rule: { kind: 'block_sequence' },
  });

  let edit;
  if (flowSequence) {
    // Insert before the closing `]` so the entry stays inside the flow
    // sequence; a trailing comment is a sibling node and is left untouched.
    const closingBracketIndex = flowSequence.range().end.index - 1;
    edit = {
      startPos: closingBracketIndex,
      endPos: closingBracketIndex,
      insertedText: `${globs.length ? ', ' : ''}'${rel}'`,
    };
  } else if (blockSequence) {
    // Prepend a block item, matching the indentation of the existing items.
    const seqRange = blockSequence.range();
    const startPos = seqRange.start.index - seqRange.start.column;
    edit = {
      startPos,
      endPos: startPos,
      insertedText: `${' '.repeat(seqRange.start.column)}- ${rel}\n`,
    };
  } else {
    // `packages:` exists but holds no sequence we can safely extend (e.g. an
    // empty or null value); leave it to the user rather than guess a layout.
    return {
      outcome: 'manual',
      entry: rel,
      reason: 'the packages: section has no sequence to extend',
    };
  }

  const updated = astRoot.commitEdits([edit]);
  await fs.promises.writeFile(file, updated, 'utf8');

  return { outcome: 'registered', entry: rel, file };
};
