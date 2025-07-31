import path from 'path';
import { inspect } from 'util';

import { glob } from 'fast-glob';
import fs from 'fs-extra';

import { isErrorWithCode } from '../../../../../../utils/error.js';
import { log } from '../../../../../../utils/logging.js';
import { formatPrettier } from '../../../../../configure/processing/prettier.js';
import type { PatchFunction, PatchReturnType } from '../../index.js';

const addListener = (identifier: string) =>
  `
// Report unhandled rejections instead of crashing the process
// Make sure to monitor these reports and alert as appropriate
process.on('unhandledRejection', (err) =>
  ${identifier}.error(err, 'Unhandled promise rejection'),
);
`.trim();

const tryReadFilesSequentially = async (
  filepaths: string[],
): Promise<{ contents: string; filepath: string } | undefined> => {
  for (const filepath of filepaths) {
    try {
      const contents = await fs.promises.readFile(filepath, 'utf8');

      return { contents, filepath };
    } catch (err) {
      if (isErrorWithCode(err, 'ENOENT')) {
        continue;
      }

      throw err;
    }
  }

  return;
};

export const IMPORT_REGEX =
  /import\s+(?:\{\s*(\w*[Ll]ogger)(?:\s+as\s+(\w*[Ll]ogger))?\s*\}|(\w*[Ll]ogger))\s+from\s+['"][^'"]+\/(?:logger|logging)(?:\.js)?['"]/u;

export const NAMED_EXPORT_REGEX =
  /export\s+(?:const\s+|\{[^{}]*)\b(\w*[Ll]ogger)\b/u;

const findLogger = async ({
  contents,
  root,
}: {
  contents: string;
  root: string;
}): Promise<{ identifier: string; import?: string }> => {
  const importResult = IMPORT_REGEX.exec(contents);

  {
    const identifier =
      importResult?.[3] ?? importResult?.[2] ?? importResult?.[1];

    if (identifier) {
      return { identifier };
    }
  }

  const loggerPaths = await glob('**/{logger,logging}.ts', {
    cwd: root,
    ignore: ['**/.git', '**/node_modules'],
  });

  const loggingModule = await tryReadFilesSequentially(loggerPaths);

  if (!loggingModule) {
    return { identifier: 'console' };
  }

  const parsedPath = path.parse(path.relative(root, loggingModule.filepath));

  const importPath = path.join(parsedPath.dir, parsedPath.name);

  const namedExportResult = NAMED_EXPORT_REGEX.exec(loggingModule.contents);

  if (namedExportResult?.[1]) {
    const identifier = namedExportResult[1];

    return {
      identifier: namedExportResult[1],
      import: `import { ${identifier} } from '${importPath}';`,
    };
  }

  if (loggingModule.contents.includes('export default')) {
    return {
      identifier: 'logger',
      import: `import logger from '${importPath}';`,
    };
  }

  return { identifier: 'console' };
};

const patchUnhandledRejections = async (
  mode: 'format' | 'lint',
): Promise<PatchReturnType> => {
  const filepaths = await glob('**/src/listen.ts', {
    ignore: ['**/.git', '**/node_modules'],
  });

  let hasPatched = false;

  for (const filepath of filepaths) {
    const contents = await fs.promises.readFile(filepath, 'utf8');

    if (contents.includes('unhandledRejection')) {
      log.subtle(
        'Skipping entry point that appears to have an unhandled rejection listener:',
        filepath,
      );
      continue;
    }

    const root = path.dirname(path.dirname(filepath));

    const logger = await findLogger({ contents, root });

    log.subtle(
      'Logging unhandled rejections to',
      logger.identifier,
      'in file:',
      filepath,
    );

    const patched = [
      contents,

      ...[logger.import ? [logger.import] : []],

      addListener(logger.identifier),
    ].join('\n\n');

    const newContents = await formatPrettier(patched, { parser: 'typescript' });

    if (mode === 'lint') {
      return { result: 'apply' };
    }

    await fs.promises.writeFile(filepath, newContents);

    hasPatched = true;
  }

  if (hasPatched) {
    return { result: 'apply' };
  }

  return {
    result: 'skip',
    reason: 'no applicable src/listen.ts entry points found',
  };
};

export const tryPatchUnhandledRejections: PatchFunction = async ({
  mode,
}): Promise<PatchReturnType> => {
  try {
    return await patchUnhandledRejections(mode);
  } catch (err) {
    log.warn('Failed to patch listeners for unhandled promise rejections');
    log.subtle(inspect(err));
    return { result: 'skip', reason: 'due to an error' };
  }
};
