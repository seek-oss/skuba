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

import { createExec, exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { isLikelyPackage } from '../../../../../migrate/nodeVersion/checks.js';
import { tryRefreshConfigFiles } from '../../../refreshConfigFiles.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

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

  const edits = [assetsPair.replace('')];

  // Remove the trailing comma of the assets pair or the preceding comma if it exists to avoid leaving a dangling comma
  const maybeCommaAfter = assetsPair?.next();
  if (maybeCommaAfter?.text().trim() === ',') {
    edits.push(maybeCommaAfter.replace(''));
  } else {
    const maybeCommaBefore = assetsPair?.prev();
    if (maybeCommaBefore?.text().trim() === ',') {
      edits.push(maybeCommaBefore.replace(''));
    }
  }

  return { edits, assetsData };
};

const addSkipLibCheckToTsConfig = (ast: SgNode): Edit[] => {
  const compilerOptionsObj = ast.find({
    rule: {
      pattern: {
        context: '{"compilerOptions":}',
        selector: 'pair',
      },
    },
  });

  if (!compilerOptionsObj) {
    const startingBracket = ast.find({ rule: { pattern: '{' } });
    if (!startingBracket) {
      return [];
    }

    const edit = startingBracket.replace(
      `{
  "compilerOptions": {
    "skipLibCheck": true // tsdown has optional peer deps
  },`,
    );
    return [edit];
  }

  const skipLibCheckOption = compilerOptionsObj.find({
    rule: { pattern: '"skipLibCheck"' },
  });

  if (skipLibCheckOption) {
    return [];
  }

  const compilerOptionsStart = compilerOptionsObj.find({
    rule: { pattern: '{' },
  });

  if (!compilerOptionsStart) {
    return [];
  }

  const edit = compilerOptionsStart.replace(`{
    "skipLibCheck": true, // tsdown has optional peer deps`);
  return [edit];
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

      // If a tsconfig.json exists, add skipLibCheck: true to avoid type errors from tsdown's optional peer dependencies.
      // If it doesn't exist, do nothing and let the fix be added manually if it's required
      let tsConfigContent: string;
      const tsConfigPath = path.join(directory, 'tsconfig.json');
      try {
        tsConfigContent = await fs.promises.readFile(tsConfigPath, 'utf8');

        const tsConfigAst = (await parseAsync('json', tsConfigContent)).root();

        const tsConfigEdits = addSkipLibCheckToTsConfig(tsConfigAst);
        const updatedTsConfigJsonContent =
          tsConfigAst.commitEdits(tsConfigEdits);

        await fs.promises.writeFile(
          tsConfigPath,
          updatedTsConfigJsonContent,
          'utf8',
        );
      } catch {
        log.subtle(
          `unable to find or read tsconfig.json at ${tsConfigPath}, skipping tsconfig updates for ${packageJsonPath}`,
        );
      }

      const packageJsonAst = (
        await parseAsync('json', packageJsonContent)
      ).root();

      const { edits, assetsData } = replaceAssetsField(packageJsonAst);

      const updatedPackageJsonContent = packageJsonAst.commitEdits(edits);

      const tsdownConfigPath = path.join(directory, 'tsdown.config.ts');
      const defaultTsdownConfig = `import { defineConfig } from 'tsdown';

    export default defineConfig({
      entry: ['src/index.ts'],
      format: ['cjs', 'esm'],
      outDir: 'lib',
      dts: true,
      exports: true,
      ${assetsData ? `copy: ${JSON.stringify(assetsData)},` : ''}
    });
    `;

      if (mode === 'lint') {
        return { processed: true };
      }

      await Promise.all([
        fs.promises.writeFile(tsdownConfigPath, defaultTsdownConfig, 'utf8'),
        fs.promises.writeFile(
          packageJsonPath,
          updatedPackageJsonContent,
          'utf8',
        ),
      ]);

      const packageManager = await detectPackageManager();
      await exec(
        packageManager.command,
        'install',
        '--frozen-lockfile=false',
        '--offline',
      );

      const execInPackageDir = createExec({ cwd: directory });
      await execInPackageDir(packageManager.command, 'tsdown');

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
    await tryRefreshConfigFiles(config.mode, log);
    return await patchPackageBuilds(config);
  } catch (err) {
    log.warn('Failed to patch package builds');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to package.json error' };
  }
};
