import path from 'path';
import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { parseAsync, registerDynamicLanguage } from '@ast-grep/napi';
import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { exec } from '../../../../../../utils/exec.js';
import { log } from '../../../../../../utils/logging.js';
import { detectPackageManager } from '../../../../../../utils/packageManager.js';
import { isLikelyPackage } from '../../../../../migrate/nodeVersion/checks.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const patchPackageBuilds: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  let packageJsonPaths: string[];
  try {
    packageJsonPaths = await glob(
      ['package.json', 'packages/**/package.json'],
      {
        ignore: ['**/.git', '**/node_modules'],
      },
    );
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
  ).filter(
    (packageJsonPath): packageJsonPath is string => packageJsonPath !== null,
  );

  registerDynamicLanguage({ json });

  let foundMatch = false;

  for (const packageJsonPath of likelyPackagePaths) {
    const directory = path.dirname(packageJsonPath);

    const files = await fs.promises.readdir(directory);

    const existingTsdownConfig = files.find((file) =>
      file.startsWith('tsdown.config'),
    );
    if (existingTsdownConfig) {
      continue;
    }

    foundMatch = true;
    let packageJsonContent: string;
    try {
      packageJsonContent = await fs.promises.readFile(packageJsonPath, 'utf8');
    } catch {
      return {
        result: 'skip',
        reason: `unable to read package.json at ${packageJsonPath}`,
      };
    }

    const packageJson = await parseAsync('json', packageJsonContent);
    const ast = packageJson.root();

    const assetsArray = ast.find({
      rule: {
        kind: 'array',
        inside: {
          kind: 'pair',
          has: {
            field: 'key',
            regex: '^"assets"$',
          },
        },
      },
    });

    let assetsData;

    if (assetsArray) {
      assetsData = JSON.parse(assetsArray?.text()) as unknown;

      if (!Array.isArray(assetsData)) {
        throw new Error('skuba.assets must be an array');
      }

      if (!assetsData.every((item) => typeof item === 'string')) {
        throw new Error('skuba.assets must be an array of strings');
      }
    }

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
      continue;
    }

    await fs.promises.writeFile(tsdownConfigPath, defaultTsdownConfig, 'utf8');

    const packageManager = await detectPackageManager();
    await exec(packageManager.command, 'tsdown');
  }

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
