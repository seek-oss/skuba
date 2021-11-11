import path from 'path';

import fs from 'fs-extra';
import { Options, check, format, getFileInfo, resolveConfig } from 'prettier';

import { crawlDirectory } from '../../utils/dir';
import { Logger, pluralise } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';

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

const formatOrLintFile = (
  { data, filepath, options }: File,
  mode: 'format' | 'lint',
  result: Result,
): string | undefined => {
  if (mode === 'lint') {
    let ok: boolean;
    try {
      ok = check(data, options);
    } catch (err) {
      result.errored.push({ err, filepath });
      return;
    }

    if (!ok) {
      result.errored.push({ filepath });
    }

    return;
  }

  let formatted: string;
  try {
    formatted = format(data, options);
  } catch (err) {
    result.errored.push({ err, filepath });
    return;
  }

  if (formatted === data) {
    return;
  }

  result.touched.push(filepath);
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
): Promise<PrettierOutput> => {
  logger.debug('Initialising Prettier...');

  const start = process.hrtime.bigint();

  let directory = process.cwd();

  const manifest = await getConsumerManifest();
  if (manifest) {
    directory = path.dirname(manifest.path);
  }

  logger.debug(
    manifest ? 'Detected project root:' : 'Detected working directory:',
    directory,
  );

  logger.debug('Discovering files...');

  // Match Prettier's opinion of not respecting `.gitignore`.
  // This avoids exhibiting different behaviour than a Prettier IDE integration,
  // and the headache of conflicting `.gitignore` and `.prettierignore` rules.
  const filepaths = await crawlDirectory(directory, '.prettierignore');

  logger.debug(`Discovered ${pluralise(filepaths.length, 'file')}.`);

  const result: Result = {
    count: filepaths.length,
    errored: [],
    touched: [],
    unparsed: [],
  };

  logger.debug(mode === 'format' ? 'Formatting' : 'Linting', 'files...');

  for (const filepath of filepaths) {
    // Infer parser upfront so we can skip unsupported files.
    const fileInfo = await getFileInfo(filepath, { resolveConfig: false });

    logger.debug(filepath);
    logger.debug('  parser:', fileInfo.inferredParser ?? '-');

    if (!fileInfo.inferredParser) {
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

    const formatted = formatOrLintFile(file, mode, result);

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
      logger.warn(filepath, ...(err ? [String(err)] : []));
    }
  }

  return { ok: result.errored.length === 0, result };
};
