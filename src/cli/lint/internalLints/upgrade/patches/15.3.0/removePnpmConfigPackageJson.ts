import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';
import * as z from 'zod';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const pnpmConfigSchema = z.looseObject({
  pnpm: z
    .looseObject({
      configDependencies: z
        .looseObject({
          'pnpm-plugin-skuba': z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

export const removePnpmConfigPackageJson: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const packageJsonPaths = await fg(['**/package.json'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (packageJsonPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no package.json files found',
    };
  }

  const packageJsonFiles = await Promise.all(
    packageJsonPaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  const patchedPackageJsonFiles = packageJsonFiles
    .map(({ file, contents }) => {
      let parsed: z.infer<typeof pnpmConfigSchema>;
      try {
        parsed = pnpmConfigSchema.parse(JSON.parse(contents));
      } catch {
        return null;
      }

      if (!parsed.pnpm?.configDependencies?.['pnpm-plugin-skuba']) {
        return null;
      }

      delete parsed.pnpm.configDependencies['pnpm-plugin-skuba'];
      if (Object.keys(parsed.pnpm.configDependencies).length === 0) {
        delete parsed.pnpm.configDependencies;
      }

      if (Object.keys(parsed.pnpm).length === 0) {
        delete parsed.pnpm;
      }

      return {
        file,
        content: JSON.stringify(parsed, null, 2),
      };
    })
    .filter((file) => file !== null);

  if (patchedPackageJsonFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no package.json files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    patchedPackageJsonFiles.map(async ({ file, content }) => {
      await fs.promises.writeFile(file, content, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryRemovePnpmConfigPackageJson: PatchFunction = async (args) => {
  try {
    return await removePnpmConfigPackageJson(args);
  } catch (err) {
    log.warn(
      'Failed to remove pnpm-plugin-skuba from package.json pnpm config',
    );
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
