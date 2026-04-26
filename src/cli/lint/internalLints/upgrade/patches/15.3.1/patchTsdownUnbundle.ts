import path from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';
import { removeNodeWithComma } from '../15.2.0/migrateTsdown.js';

const removeUnbundleFieldEdits = (node: SgNode): Edit[] => {
  const unbundlePair = node.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^unbundle$',
      },
    },
  });

  if (!unbundlePair) {
    return [];
  }

  const nextNode = unbundlePair.next();
  const maybeComment = nextNode?.kind() === ',' ? nextNode.next() : nextNode;

  if (
    maybeComment?.kind() !== 'comment' ||
    maybeComment.text() !== '// TODO: determine if your project can be bundled'
  ) {
    return [];
  }

  const edits = removeNodeWithComma(unbundlePair);
  if (edits.length === 0) {
    return [];
  }

  const lastEdit = edits[edits.length - 1];
  return [
    ...edits.slice(0, -1),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    { ...lastEdit!, endPos: maybeComment.range().end.index },
  ];
};

const packageShipsTranslations = async (packageDir: string) => {
  const translations = await fg(['**/.vocab/**'], {
    cwd: packageDir,
    ignore: ['**/.git', '**/node_modules'],
  });
  return translations.length > 0;
};

const packageShipsCss = async (packageDir: string) => {
  const cssFiles = await fg(['**/*.css'], {
    cwd: packageDir,
    ignore: ['**/.git', '**/node_modules'],
  });
  return cssFiles.length > 0;
};

type SkipReason = 'potentially ships translations' | 'potentially ships css';

type Config =
  | { kind: 'skipped'; file: string; reason: SkipReason }
  | { kind: 'parsed'; file: string; updated: string | undefined };

export const patchTsdownUnbundle: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsdownFiles = await fg(['**/tsdown.config.{ts,js,mjs,mts,cts}'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (tsdownFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsdown.config files found',
    };
  }

  const tsdownConfigs = await Promise.all(
    tsdownFiles.map(async (file): Promise<Config> => {
      const packageDir = path.dirname(file);
      const [content, shipsTranslations, shipsCss] = await Promise.all([
        fs.promises.readFile(file, 'utf8'),
        packageShipsTranslations(packageDir),
        packageShipsCss(packageDir),
      ]);

      if (shipsTranslations) {
        return {
          kind: 'skipped',
          file,
          reason: 'potentially ships translations',
        };
      }

      if (shipsCss) {
        return { kind: 'skipped', file, reason: 'potentially ships css' };
      }

      const ast = (await parseAsync('TypeScript', content)).root();
      const edits = removeUnbundleFieldEdits(ast);
      const updated = edits.length ? ast.commitEdits(edits) : undefined;
      return { kind: 'parsed', file, updated };
    }),
  );

  const parsedConfigs = tsdownConfigs.filter(
    (entry): entry is Extract<Config, { kind: 'parsed' }> =>
      entry.kind === 'parsed',
  );

  if (parsedConfigs.length === 0) {
    const firstSkippedEntry = tsdownConfigs.find((e) => e.kind === 'skipped');
    return {
      result: 'skip',
      reason: firstSkippedEntry?.reason ?? 'no tsdown.config fields to migrate',
    };
  }

  const configsToUpdate = parsedConfigs.filter(
    (entry): entry is { kind: 'parsed'; file: string; updated: string } =>
      entry.updated !== undefined,
  );

  if (configsToUpdate.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsdown.config fields to migrate',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    configsToUpdate.map(async ({ file, updated }) => {
      await fs.promises.writeFile(file, updated, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchTsdownUnbundle: PatchFunction = async (config) => {
  try {
    return await patchTsdownUnbundle(config);
  } catch (err) {
    log.warn('Failed to apply tsdown unbundle patch.');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
