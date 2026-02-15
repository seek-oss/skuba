import path from 'path';
import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import {
  type Edit,
  type SgNode,
  parseAsync,
  registerDynamicLanguage,
} from '@ast-grep/napi';
import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { isLikelyPackage } from '../../../../../migrate/nodeVersion/checks.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const replaceField = (
  ast: SgNode,
  fieldName: string,
  fieldValue: string | string[],
): Edit[] => {
  const pair = ast.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: `^"${fieldName}"$`,
      },
    },
  });

  if (!pair) {
    return [];
  }

  const valueNode = pair.child(1);
  if (!valueNode) {
    return [];
  }

  const formattedValue = Array.isArray(fieldValue)
    ? `[${fieldValue.join(', ')}]`
    : `"${fieldValue}"`;

  const edits: Edit[] = [pair.replace(`"${fieldName}": ${formattedValue}`)];
  return edits;
};

const addExportsField = (ast: SgNode): Edit[] => {
  const existingExports = ast.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^"exports"$',
      },
    },
  });

  if (existingExports) {
    return [];
  }

  const exportsValue = `{
    ".": {
      "import": "./lib/index.mjs",
      "require": "./lib/index.cjs"
    },
    "./package.json": "./package.json"
  }`;

  const rootObject = ast.find({
    rule: {
      kind: 'object',
    },
  });

  if (!rootObject) {
    return [];
  }

  const firstPair = rootObject.find({
    rule: {
      kind: 'pair',
    },
  });

  if (!firstPair) {
    return [
      rootObject.replace(`{
  "exports": ${exportsValue}
}`),
    ];
  }

  const edits: Edit[] = [
    firstPair.replace(`"exports": ${exportsValue},
  ${firstPair.text()}`),
  ];

  return edits;
};

const replaceAssetsField = (
  ast: SgNode,
): { edits: Edit[]; assetsData: string[] | null } => {
  const skubaObject = ast.find({
    rule: {
      kind: 'object',
      inside: {
        kind: 'pair',
        has: {
          field: 'key',
          regex: '^"skuba"$',
        },
      },
    },
  });

  const assetsPair = skubaObject?.find({
    rule: {
      kind: 'pair',
      has: {
        field: 'key',
        regex: '^"assets"$',
      },
    },
  });

  if (!assetsPair) {
    return { edits: [], assetsData: null };
  }

  const assetsArray = assetsPair.find({
    rule: {
      kind: 'array',
    },
  });

  if (!assetsArray) {
    throw new Error('assets array not found in package.json');
  }

  const assetsData = JSON.parse(assetsArray.text()) as unknown;

  if (!Array.isArray(assetsData)) {
    throw new Error('skuba.assets must be an array');
  }

  if (!assetsData.every((item) => typeof item === 'string')) {
    throw new Error('skuba.assets must be an array of strings');
  }

  const maybeCommaAfterAssets = assetsPair?.next();
  const edits = [assetsPair.replace('')];

  if (maybeCommaAfterAssets?.text().trim() === ',') {
    edits.push(maybeCommaAfterAssets.replace(''));
  }
  return { edits, assetsData };
};

export const patchPackageBuilds: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let packageJsonPaths: string[];
  try {
    packageJsonPaths = await glob(['**/package.json'], {
      ignore: ['**/.git', '**/node_modules'],
    });
  } catch {
    return {
      result: 'skip',
      reason: 'unable to find package.json files',
    };
  }

  if (packageJsonPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'unable to find package.json files',
    };
  }

  const likelyPackagePaths = (
    await Promise.all(
      packageJsonPaths.map(async (packageJsonPath) =>
        (await isLikelyPackage(packageJsonPath)) ? packageJsonPath : null,
      ),
    )
  ).filter((packageJsonPath) => packageJsonPath !== null);

  registerDynamicLanguage({ json });

  const results = await Promise.all(
    likelyPackagePaths.map(async (packageJsonPath) => {
      const directory = path.dirname(packageJsonPath);

      const files = await fs.promises.readdir(directory);

      const existingTsdownConfig = files.find((file) =>
        file.startsWith('tsdown.config'),
      );
      if (existingTsdownConfig) {
        return null;
      }

      let packageJsonContent: string;
      try {
        packageJsonContent = await fs.promises.readFile(
          packageJsonPath,
          'utf8',
        );
      } catch {
        throw new Error(`unable to read package.json at ${packageJsonPath}`);
      }

      const packageJson = await parseAsync('json', packageJsonContent);
      const ast = packageJson.root();

      const fieldsToReplace = [
        { field: 'main', replacementValue: './lib/index.cjs' },
        { field: 'module', replacementValue: './lib/index.mjs' },
        { field: 'types', replacementValue: './lib/index.d.cts' },
        { field: 'files', replacementValue: ['"lib"'] },
      ];

      const edits = fieldsToReplace.flatMap(({ field, replacementValue }) =>
        replaceField(ast, field, replacementValue),
      );

      edits.push(...addExportsField(ast));

      const { edits: assetsEdits, assetsData } = replaceAssetsField(ast);

      edits.push(...assetsEdits);

      let updatedPackageJsonContent = packageJsonContent;

      updatedPackageJsonContent = ast.commitEdits(edits);

      const tsdownConfigPath = path.join(directory, 'tsdown.config.ts');
      const defaultTsdownConfig = `import { defineConfig } from 'tsdown';

    export default defineConfig({
      entry: ['src/index.ts'],
      format: ['cjs', 'esm'],
      outDir: 'lib',
      dts: true,
      ${assetsData ? `copy: ${JSON.stringify(assetsData)},` : ''}
    });
    `;

      if (mode === 'lint') {
        return { processed: true };
      }

      await fs.promises.writeFile(
        tsdownConfigPath,
        defaultTsdownConfig,
        'utf8',
      );

      await fs.promises.writeFile(
        packageJsonPath,
        updatedPackageJsonContent,
        'utf8',
      );

      const packageManager = await detectPackageManager();
      await exec(packageManager.command, 'tsdown');

      return { processed: true };
    }),
  );

  const foundMatch = results.some((result) => result !== null);

  if (foundMatch) {
    return {
      result: 'apply',
    };
  }

  return {
    result: 'skip',
    reason: 'no skuba build-package command found',
  };
};

export const tryPatchPackageBuilds: PatchFunction = async (config) => {
  try {
    return await patchPackageBuilds(config);
  } catch (err) {
    log.warn('Failed to patch package builds');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to package.json error' };
  }
};
