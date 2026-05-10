import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspect } from 'util';

import { type Edit, parseAsync } from '@ast-grep/napi';
import fg from 'fast-glob';
import fs from 'fs-extra';
import { resolve } from 'import-meta-resolve';
import { ModuleResolutionKind } from 'typescript';

import { log } from '../../../utils/logging.js';
import { readTsConfig } from '../../build/tsc.js';
import type { PatchFunction } from '../../lint/internalLints/upgrade/index.js';

const nodeModuleExtensionCheckOrder = [
  '.js',
  '/index.js',
  '.mjs',
  '/index.mjs',
];
const localModuleExtensionCheckOrder = [
  '.ts',
  '/index.ts',
  '.js',
  '/index.js',
  '.mjs',
  '/index.mjs',
];

export const addFileExtensions: PatchFunction = async ({ mode }) => {
  const tsconfig = readTsConfig({
    dir: process.cwd(),
    log,
    fileName: 'tsconfig.json',
    silentlyFail: true,
  });

  if (tsconfig?.options.moduleResolution === ModuleResolutionKind.Bundler) {
    return {
      result: 'skip',
      reason:
        'module resolution is set to bundler, which should not require file extensions',
    };
  }

  const tsFilePaths = await fg(['**/*.ts'], {
    ignore: ['**/.git', '**/node_modules'],
  });

  if (!tsFilePaths.length) {
    return {
      result: 'skip',
      reason: 'no .ts files found',
    };
  }

  const tsFiles = await Promise.all(
    tsFilePaths.map(async (file) => ({
      file,
      contents: await fs.promises.readFile(file, 'utf8'),
    })),
  );

  const patches = await Promise.all(
    tsFiles.map(async ({ file, contents }) => {
      const root = (await parseAsync('TypeScript', contents)).root();
      const nodesToCheck = root.findAll({
        rule: {
          kind: 'string_fragment',
          inside: {
            kind: 'string',
            inside: {
              any: [
                // any imports such as import './foo' or import {bar} from './foo'
                {
                  kind: 'import_statement',
                },
                {
                  kind: 'arguments',
                  any: [
                    // vi.importActual('./foo')
                    {
                      inside: {
                        kind: 'call_expression',
                        regex: '^vi.importActual\\(',
                      },
                    },
                    // Dynamic imports eg. import('./foo)
                    {
                      follows: {
                        kind: 'import',
                      },
                    },
                  ],
                },
                // Import Actual with generic: eg. vi.importActual<typeof import('./foo')>(./foo)
                {
                  kind: 'parenthesized_expression',
                  inside: {
                    kind: 'binary_expression',
                    regex: '^vi.importActual<',
                  },
                },
              ],
            },
          },
          any: [
            // scoped packages with 3 or more path segments
            {
              all: [
                { regex: '^@[^/]+/[^/]+/.+$' },
                { not: { regex: '\.(cjs|mjs|js|ts|tsx|json|css|scss|sass)$' } },
              ],
            },
            // unscoped packages with 1 or more path segments
            {
              all: [
                { regex: '^[^@][^/]*/.+$' },
                { not: { regex: '\.(cjs|mjs|js|ts|tsx|json|css|scss|sass)$' } },
                // exclude import aliases
                { not: { regex: '^#' } },
                // exclude node: built-in modules
                { not: { regex: '^node:' } },
              ],
            },
            // relative imports
            {
              all: [
                { regex: '^./' },
                { not: { regex: '\.(cjs|mjs|js|ts|tsx|json|css|scss|sass)$' } },
              ],
            },
          ],
        },
      });

      if (!nodesToCheck.length) {
        return null;
      }

      const parentPath = pathToFileURL(file).href;
      const resolvedPaths = new Map<string, string | null>();
      const edits: Array<Edit | null> = await Promise.all(
        nodesToCheck.map(async (node) => {
          const text = node.text();
          const resolvedPath = resolvedPaths.get(text);

          if (resolvedPath === null) {
            return null;
          }

          if (resolvedPath) {
            return node.replace(resolvedPath);
          }

          let resolved;

          try {
            resolved = resolve(text, parentPath);
          } catch {
            // unknown import - give up
            resolvedPaths.set(text, null);
            return null;
          }
          if (resolved.endsWith('.js')) {
            // Likely a package module
            return null;
          }

          // Skip non-file URLs (e.g., node:, data:, http:)
          if (!resolved.startsWith('file:')) {
            resolvedPaths.set(text, null);
            return null;
          }

          const pathToResolved = fileURLToPath(resolved);

          const orderToCheck = pathToResolved.includes('node_modules')
            ? nodeModuleExtensionCheckOrder
            : localModuleExtensionCheckOrder;

          for (const extension of orderToCheck) {
            const filePath = `${pathToResolved}${extension}`;
            try {
              await fs.promises.access(filePath);
              const fixedImport = `${text}${extension.endsWith('.ts') ? extension.replace('.ts', '.js') : extension}`;
              resolvedPaths.set(text, fixedImport);
              return node.replace(fixedImport);
            } catch {}
          }

          resolvedPaths.set(text, null);
          return null;
        }),
      );

      return {
        file,
        contents: root.commitEdits(edits.filter((edit) => edit !== null)),
      };
    }),
  );

  const actualPatches = patches.filter((patch) => patch !== null);

  if (actualPatches.length === 0) {
    return {
      result: 'skip',
      reason: 'no imports found that could be migrated',
    };
  }

  if (mode === 'lint') {
    return {
      result: 'apply',
    };
  }

  await Promise.all(
    actualPatches.map(async ({ file, contents }) => {
      await fs.promises.writeFile(file, contents, 'utf8');
    }),
  );

  return {
    result: 'apply',
  };
};

export const tryAddFileExtensions: PatchFunction = async (opts) => {
  try {
    return await addFileExtensions(opts);
  } catch (err) {
    log.warn('Failed to add file extensions, skipping');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
