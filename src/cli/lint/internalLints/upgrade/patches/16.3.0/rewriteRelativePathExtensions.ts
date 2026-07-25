import path from 'node:path';
import { inspect } from 'util';

import fg from 'fast-glob';
import fs from 'fs-extra';

import { log } from '../../../../../../utils/logging.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

/*
Matches static imports and re-exports. For example:
  import './side-effect.js' - side-effect imports
  import type { Foo } from './foo.js' - type-only imports
  import type * as Foo from './foo.js' - type-only namespace imports
  import { Foo, Bar } from './foo.js' - named imports
  import * as Foo from './foo.js' - namespace imports
  import Foo from './foo.js' - default imports
  import Foo, { Bar } from './foo.js' - mixed imports
  export { Foo } from './foo.js' - re-exports
  export * from './foo.js' - namespace re-exports
*/
export const hasStaticImportRegex =
  /\b(?:import|export)\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+))?)\s+from\s+)?['"][^'"]+['"]/gm;

/*
Matches dynamic imports. For example:
  import('./foo.js')
  await import("#src/foo.js")
  vi.importActual<typeof import('./foo.js')>('./foo.js')
*/
export const hasDynamicImportRegex = /\bimport\(\s*['"][^'"]+['"]\s*\)/gm;

/*
Matches module mocks. For example:
  vi.mock('./foo.js')
  vi.importActual('#src/foo.js')
  vi.importActual<typeof import('./foo.js')>('./foo.js')
  jest.doMock('./foo.js', () => ({}))
*/
export const hasModuleMockRegex =
  /\b(?:jest|vi)\.(?:mock|doMock|importActual|importMock)(?:<[^>]*>)?\(\s*['"][^'"]+['"]/gm;

const importStatementRegex = new RegExp(
  [
    hasStaticImportRegex.source,
    hasDynamicImportRegex.source,
    hasModuleMockRegex.source,
  ].join('|'),
  'gm',
);

const relativeJsSpecifierRegex = /(['"])(\.\.?\/[^'"]+)\.js\1/g;

const srcJsSpecifierRegex = /(['"])(#src\/[^'"]+)\.js\1/g;

// A Set of absolute paths to all known .ts files in the project,
// used for quick lookup to check if the file actually exists.
export type TsFileSet = Set<string>;

export const buildTsFileSet = (tsFileNames: string[]): TsFileSet =>
  new Set(tsFileNames.map((f) => path.resolve(f)));

export const rewriteImportPathExtensions = (
  contents: string,
  file: string,
  tsFileSet: TsFileSet,
): string => {
  const dir = path.dirname(path.resolve(file));

  return contents.replace(importStatementRegex, (statement) => {
    const withRelativeRewrites = statement.replace(
      relativeJsSpecifierRegex,
      (match, quote, specifierWithoutExt) => {
        const absoluteTsPath = path.resolve(
          dir,
          `${specifierWithoutExt}.ts`,
        );

        // Only rewrite to .ts if a corresponding .ts file actually exists,
        // leaving genuine .js files (e.g. prettier.js, postcss.js) untouched.
        if (tsFileSet.has(absoluteTsPath)) {
          return `${quote}${specifierWithoutExt}.ts${quote}`;
        }
        return match;
      },
    );

    return withRelativeRewrites.replace(srcJsSpecifierRegex, '$1$2$1');
  });
};

export const fetchFiles = async (files: string[]) =>
  Promise.all(
    files.map(async (file) => {
      const contents = await fs.promises.readFile(file, 'utf8');
      return {
        file,
        contents,
      };
    }),
  );

export const tryRewriteRelativePathExtensions: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  const tsFileNames = await fg(['**/*.ts', '**/*.test.ts'], {
    ignore: [
      '**/.git',
      '**/node_modules',
      'src/cli/lint/internalLints/upgrade/patches/**/*',
    ],
  });

  if (!tsFileNames.length) {
    return {
      result: 'skip',
      reason: 'no .ts or test.ts files found',
    };
  }

  const tsFileSet = buildTsFileSet(tsFileNames);

  const tsFiles = await fetchFiles(tsFileNames);

  const mapped = tsFiles.map(({ file, contents }) => ({
    file,
    before: contents,
    after: rewriteImportPathExtensions(contents, file, tsFileSet),
  }));

  const hasChanges = mapped.some(({ before, after }) => before !== after);

  if (!hasChanges) {
    return { result: 'skip', reason: 'no import path changes required' };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    mapped.map(async ({ file, before, after }) => {
      if (before !== after) {
        await fs.promises.writeFile(file, after);
      }
    }),
  );

  return { result: 'apply' };
};

export const rewriteRelativePathExtensions: PatchFunction = async (config) => {
  try {
    return await tryRewriteRelativePathExtensions(config);
  } catch (err) {
    log.warn('Failed to rewrite relative and #src import path extensions');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
