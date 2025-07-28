import path from 'path';

import fs from 'fs-extra';
import {
  type Options,
  type SupportLanguage,
  check,
  format,
  getSupportInfo,
  resolveConfig,
} from 'prettier';

import { crawlDirectory } from '../../utils/dir.js';
import { type Logger, pluralise } from '../../utils/logging.js';
import { getConsumerManifest } from '../../utils/manifest.js';
import {
  formatPackage,
  parsePackage,
} from '../configure/processing/package.js';

let languages: SupportLanguage[] | undefined;

/**
 * Infers a parser for the specified filepath.
 *
 * This is a cut-down version of Prettier's built-in function of the same name;
 * ours operates purely on the `filepath` string and does not perform file I/O.
 * Prettier's internal `getInterpreter` function can open a file to read the
 * shebang, and its file descriptor usage can throw warnings on worker threads:
 *
 * ```console
 * Warning: File descriptor 123 closed but not opened in unmanaged mode
 *     at Object.closeSync (node:fs:530:11)
 *     at Object.closeSync (node_modules/graceful-fs/graceful-fs.js:74:20)
 *     ...
 * ```
 *
 * References:
 *
 * - https://github.com/prettier/prettier/blob/2.4.1/src/main/options.js#L167
 * - seek-oss/skuba#659
 */
export const inferParser = async (
  filepath: string,
): Promise<string | undefined> => {
  const filename = path.basename(filepath).toLowerCase();

  languages ??= (await getSupportInfo()).languages;

  const firstLanguage = languages.find(
    (language) =>
      language.extensions?.some((extension) => filename.endsWith(extension)) ||
      language.filenames?.some((name) => name.toLowerCase() === filename),
  );

  return firstLanguage?.parsers[0];
};

const isPackageJsonOk = async ({
  data,
  filepath,
}: {
  data: string;
  filepath: string;
}): Promise<boolean> => {
  if (path.basename(filepath) !== 'package.json') {
    return true;
  }

  try {
    const packageJson = parsePackage(data);

    return !packageJson || (await formatPackage(packageJson)) === data;
  } catch {
    // Be more lenient about our custom formatting and don't throw if it errors.
  }

  return true;
};

interface File {
  data: string;
  options: Options;
  filepath: string;
}

interface Result {
  count: number;
  errored: Array<{ err?: unknown; filepath: string }>;
  touched: string[];
  unparsed: string[];
}

export const formatOrLintFile = async (
  { data, filepath, options }: File,
  mode: 'format' | 'lint',
  result: Result | null,
): Promise<string | undefined> => {
  if (mode === 'lint') {
    let ok: boolean;
    try {
      ok =
        (await check(data, options)) &&
        (await isPackageJsonOk({ data, filepath }));
    } catch (err) {
      result?.errored.push({ err, filepath });
      return;
    }

    if (!ok) {
      result?.errored.push({ filepath });
    }

    return;
  }

  let formatted: string;
  try {
    formatted = await format(data, options);
  } catch (err) {
    result?.errored.push({ err, filepath });
    return;
  }

  // Perform additional formatting (i.e. sorting) on a `package.json` manifest.
  try {
    if (path.basename(filepath) === 'package.json') {
      const packageJson = parsePackage(formatted);
      if (packageJson) {
        formatted = await formatPackage(packageJson);
      }
    }
  } catch {
    // Be more lenient about our custom formatting and don't throw if it errors.
  }

  if (formatted === data) {
    return;
  }

  result?.touched.push(filepath);
  return formatted;
};

export interface PrettierOutput {
  ok: boolean;
  result: Result;
}

/**
 * Formats/lints files with Prettier.
 *
 * Prettier doesn't provide a higher-level Node.js API that replicates the
 * behaviour of its CLI, so we have to plumb together its lower-level functions.
 * On the other hand, this affords more flexibility in how we track and report
 * on progress and results.
 */
export const runPrettier = async (
  mode: 'format' | 'lint',
  logger: Logger,
  cwd = process.cwd(),
): Promise<PrettierOutput> => {
  logger.debug('Initialising Prettier...');

  const start = process.hrtime.bigint();

  const manifest = await getConsumerManifest(cwd);

  const directory = manifest ? path.dirname(manifest.path) : cwd;

  logger.debug(
    manifest ? 'Detected project root:' : 'Detected working directory:',
    directory,
  );

  logger.debug('Discovering files...');

  // Match Prettier's opinion of respecting `.gitignore`.
  // This avoids exhibiting different behaviour than a Prettier IDE integration,
  // though it may present headaches if `.gitignore` and `.prettierignore` rules
  // conflict.
  const relativeFilepaths = await crawlDirectory(directory, [
    '.gitignore',
    '.prettierignore',
  ]);

  logger.debug(`Discovered ${pluralise(relativeFilepaths.length, 'file')}.`);

  const result: Result = {
    count: relativeFilepaths.length,
    errored: [],
    touched: [],
    unparsed: [],
  };

  logger.debug(mode === 'format' ? 'Formatting' : 'Linting', 'files...');

  for (const relativeFilepath of relativeFilepaths) {
    // Use relative paths to keep log output cleaner, particularly in the common
    // case where we are executing against the current working directory.
    const filepath = path.relative(
      process.cwd(),
      path.join(directory, relativeFilepath),
    );

    // Infer parser upfront so we can skip unsupported files.
    const parser = await inferParser(filepath);

    logger.debug(filepath);
    logger.debug('  parser:', parser ?? '-');

    if (!parser) {
      result.unparsed.push(filepath);
      continue;
    }

    const [config, data] = await Promise.all([
      resolveConfig(filepath),
      fs.promises.readFile(filepath, 'utf-8'),
    ]);

    const file: File = {
      data,
      filepath,
      options: { ...config, filepath },
    };

    const formatted = await formatOrLintFile(file, mode, result);

    if (typeof formatted === 'string') {
      await fs.promises.writeFile(filepath, formatted);
    }
  }

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${pluralise(
      result.count - result.unparsed.length,
      'file',
    )} in ${logger.timing(start, end)}.`,
  );

  if (result.touched.length) {
    logger.plain(`Formatted ${pluralise(result.touched.length, 'file')}:`);
    for (const filepath of result.touched) {
      logger.warn(filepath);
    }
  }

  if (result.errored.length) {
    logger.plain(`Flagged ${pluralise(result.errored.length, 'file')}:`);
    for (const { err, filepath } of result.errored) {
      logger.warn(
        filepath,
        ...(typeof err === 'string' || err instanceof Error
          ? [String(err)]
          : []),
      );
    }
  }

  return { ok: result.errored.length === 0, result };
};
