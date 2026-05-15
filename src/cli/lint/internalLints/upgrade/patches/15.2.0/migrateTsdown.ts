import { dirname } from 'path';
import { inspect } from 'util';

import { type Edit, type SgNode, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { createExec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const FIELD_REMAPPING = {
  external: 'neverBundle',
  noExternal: 'alwaysBundle',
  inlineOnly: 'onlyBundle',
  skipNodeModulesBundle: 'skipNodeModulesBundle',
} as const;

type OldKey = keyof typeof FIELD_REMAPPING;

interface FoundEntry {
  newKey: string;
  valueText: string;
  pairNode: SgNode;
}

export const removeNodeWithComma = (node: SgNode): Edit[] => {
  const edits: Edit[] = [node.replace('')];
  const maybeCommaAfter = node.next();
  if (maybeCommaAfter?.text().trim() === ',') {
    edits.push(maybeCommaAfter.replace(''));
  } else {
    const maybeCommaBefore = node.prev();
    if (maybeCommaBefore?.text().trim() === ',') {
      edits.push(maybeCommaBefore.replace(''));
    }
  }
  return edits;
};

const migrateDepsFields = (ast: SgNode): Edit[] => {
  const callExpr = ast.find({
    rule: {
      kind: 'call_expression',
      has: {
        field: 'function',
        pattern: 'defineConfig',
      },
    },
  });

  if (!callExpr) {
    return [];
  }

  const configObject = callExpr.find({
    rule: { kind: 'object' },
  });

  if (!configObject) {
    return [];
  }

  const existingDepsPair = configObject.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^deps$',
      },
    },
  });

  if (existingDepsPair) {
    return [];
  }

  const foundEntries: FoundEntry[] = [];

  for (const [oldKey, newKey] of Object.entries(FIELD_REMAPPING) as Array<
    [OldKey, string]
  >) {
    const pairNode = configObject.find({
      rule: {
        kind: 'pair',
        has: {
          field: 'key',
          regex: `^${oldKey}$`,
        },
      },
    });

    if (!pairNode) {
      continue;
    }

    // Strip "key: " prefix from the pair text to get just the value
    const valueText = pairNode
      .text()
      .replace(new RegExp(`^${oldKey}\\s*:\\s*`), '');

    foundEntries.push({ newKey, valueText, pairNode });
  }

  const startingBracket = configObject.find({ rule: { pattern: '{' } });

  if (!startingBracket) {
    return [];
  }

  const existingFailOnWarn = configObject.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^failOnWarn$',
      },
    },
  });

  if (existingFailOnWarn && !foundEntries.length) {
    return [];
  }

  const edit = startingBracket.replace(
    `{
  ${
    foundEntries.length
      ? `deps: {
    ${foundEntries
      .map(({ newKey, valueText }) => `${newKey}: ${valueText}`)
      .join(',\n    ')}
  },`
      : ''
  }
  ${existingFailOnWarn ? '' : 'failOnWarn: true,'}`,
  );

  const edits: Edit[] = [
    edit,
    ...foundEntries.flatMap(({ pairNode }) => removeNodeWithComma(pairNode)),
  ];

  return edits;
};

export const migrateTsdown: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsdownFiles = await fg('**/tsdown.config.{mts,ts}', {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (tsdownFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsdown.config files found',
    };
  }

  const tsdownConfigs = await Promise.all(
    tsdownFiles.map(async (file) => {
      const content = await fs.promises.readFile(file, 'utf8');
      return { file, content };
    }),
  );

  const parsedConfigs = await Promise.all(
    tsdownConfigs.map(async ({ file, content }) => {
      const ast = (await parseAsync('TypeScript', content)).root();
      const edits = migrateDepsFields(ast);
      const updated = edits.length ? ast.commitEdits(edits) : undefined;
      return { file, updated };
    }),
  );

  const configsToUpdate = parsedConfigs.filter(
    (file): file is { file: string; updated: string } =>
      file.updated !== undefined,
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

  const packageManager = await detectPackageManager();

  // Update package.json with new inlinedDependencies fields if needed
  await Promise.all(
    configsToUpdate.map(async ({ file }) => {
      const execInPackageDir = createExec({ cwd: dirname(file) });
      await execInPackageDir(packageManager.command, 'tsdown');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryMigrateTsdown: PatchFunction = async (config) => {
  try {
    return await migrateTsdown(config);
  } catch (err) {
    log.warn('Failed to migrate tsdown to 0.21');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
