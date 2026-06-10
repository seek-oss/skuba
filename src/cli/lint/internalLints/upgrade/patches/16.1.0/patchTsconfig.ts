import { inspect } from 'util';

import { parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import { registerAstGrepLanguages } from '../../../registerAstGrepLanguages.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

export const patchTsconfig: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsconfigPaths = await fg(['**/tsconfig.json', '**/tsconfig.*.json'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (tsconfigPaths.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsconfig.json files found',
    };
  }

  const tsconfigFiles = await Promise.all(
    tsconfigPaths.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');

      return {
        file,
        contents,
      };
    }),
  );

  registerAstGrepLanguages();

  const patchedTsconfigFiles = await Promise.all(
    tsconfigFiles.map(async ({ file, contents }) => {
      const parsed = await parseAsync('json', contents);
      const ast = parsed.root();

      const baseUrlOption = ast.find({
        rule: {
          kind: 'pair',
          has: {
            field: 'key',
            has: {
              kind: 'string_content',
              regex: '^baseUrl$',
            },
          },
        },
      });

      if (!baseUrlOption) {
        return null;
      }

      const baseUrlOptionRange = baseUrlOption.range();

      let startPos = baseUrlOptionRange.start.index;
      while (
        startPos > 0 &&
        (contents[startPos - 1] === ' ' || contents[startPos - 1] === '\t')
      ) {
        startPos--;
      }

      const commaPos =
        contents[baseUrlOptionRange.end.index] === ','
          ? baseUrlOptionRange.end.index + 1
          : baseUrlOptionRange.end.index;

      const newlinePos = contents[commaPos] === '\n' ? commaPos + 1 : commaPos;

      const newSource = ast.commitEdits([
        {
          insertedText: '',
          startPos,
          endPos: newlinePos,
        },
      ]);

      return {
        file,
        content: newSource,
      };
    }),
  );

  const filteredPatchedTsconfigFiles = patchedTsconfigFiles.filter(
    (file) => file !== null,
  );

  if (filteredPatchedTsconfigFiles.length === 0) {
    return {
      result: 'skip',
      reason: 'no tsconfig.json files to patch',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    filteredPatchedTsconfigFiles.map(async ({ file, content }) => {
      await fs.promises.writeFile(file, content, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryPatchTsconfig: PatchFunction = async (args) => {
  try {
    return await patchTsconfig(args);
  } catch (err) {
    log.warn('Failed to remove baseUrl from tsconfig.json');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
