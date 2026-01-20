import { inspect } from 'util';

import json from '@ast-grep/lang-json';
import { parseAsync, registerDynamicLanguage } from '@ast-grep/napi';
import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

export const patchBuildConfig: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsconfigBuildPaths = await glob(['**/tsconfig.build.json'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (tsconfigBuildPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsconfig.build.json files found',
    };
  }
  registerDynamicLanguage({ json });

  const tsconfigFiles = await fetchFiles(tsconfigBuildPaths);

  const parsedFiles = await Promise.all(
    tsconfigFiles.map(async ({ file, contents }) => {
      const parsed = await parseAsync('json', contents);
      return {
        file,
        ast: parsed.root(),
      };
    }),
  );

  const updatedFiles = parsedFiles
    .map(({ ast, file }) => {
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
          return undefined;
        }

        const edit = startingBracket.replace(
          `{
  "compilerOptions": {
    "rootDir": "src"
  },`,
        );

        const newSource = ast.commitEdits([edit]);

        return {
          updated: newSource,
          file,
        };
      }

      const rootDirOption = compilerOptionsObj.find({
        rule: { pattern: '"rootDir"' },
      });

      if (rootDirOption) {
        return undefined;
      }

      const compilerOptionsStart = compilerOptionsObj.find({
        rule: { pattern: '{' },
      });

      if (!compilerOptionsStart) {
        return undefined;
      }

      const edit = compilerOptionsStart.replace(`{
    "rootDir": "src",`);

      const newSource = ast.commitEdits([edit]);

      return {
        updated: newSource,
        file,
      };
    })
    .filter((file) => file !== undefined);

  if (updatedFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsconfig.build.json files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    updatedFiles.map(({ file, updated }) =>
      fs.promises.writeFile(file, updated, 'utf8'),
    ),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchBuildTsConfig: PatchFunction = async (config) => {
  try {
    return await patchBuildConfig(config);
  } catch (err) {
    log.warn('Failed to patch `tsconfig.build.json`');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
