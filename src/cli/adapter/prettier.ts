import path from 'path';
import { inspect } from 'util';

import fs from 'fs-extra';
import { Options, check, format, getFileInfo, resolveConfig } from 'prettier';

import { crawlDirectory } from '../../utils/dir';
import { Logger } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';

interface File {
  data: string;
  options: Options;
  parser: string | null;
  filepath: string;
}

interface Result {
  count: number;
  errored: Array<{ err?: unknown; filepath: string }>;
  touched: Array<{ data: string; filepath: string }>;
  unparsed: string[];
}

const formatOrLintFile = (
  { data, filepath, options, parser }: File,
  logger: Logger,
  mode: 'format' | 'lint',
  result: Result,
) => {
  logger.debug(filepath);

  logger.debug('  parser:', parser ?? '-');

  if (!parser) {
    result.unparsed.push(filepath);
    return;
  }

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

  result.touched.push({ data: formatted, filepath });
};

/**
 * Formats/lints files with Prettier.
 *
 * Prettier doesn't provide a higher-level Node.js API that replicates the
 * behaviour of its CLI, so we have to plumb together its lower-level functions.
 * On the other hands, this affords more flexibility in how we track and report
 * on progress and results.
 */
export const runPrettier = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<boolean> => {
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

  logger.debug(`Discovered ${logger.pluralise(filepaths.length, 'file')}.`);

  const result: Result = {
    count: filepaths.length,
    errored: [],
    touched: [],
    unparsed: [],
  };

  logger.debug('Reading files...');

  const files = await Promise.all(
    filepaths.map<Promise<File>>(async (filepath) => {
      const [config, data, fileInfo] = await Promise.all([
        resolveConfig(filepath),
        fs.promises.readFile(filepath, 'utf-8'),
        getFileInfo(filepath, { resolveConfig: false }),
      ]);

      return {
        data,
        filepath,
        options: { ...config, filepath },
        parser: fileInfo.inferredParser,
      };
    }),
  );

  logger.debug(mode === 'format' ? 'Formatting' : 'Linting', 'files...');

  for (const file of files) {
    formatOrLintFile(file, logger, mode, result);
  }

  logger.debug(`Writing ${logger.pluralise(result.touched.length, 'file')}...`);

  await Promise.all(
    result.touched.map(({ data, filepath }) =>
      fs.promises.writeFile(filepath, data),
    ),
  );

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${logger.pluralise(
      result.count - result.unparsed.length,
      'file',
    )} in ${logger.timing(start, end)}.`,
  );

  if (result.touched.length) {
    logger.plain(
      `Formatted ${logger.pluralise(result.touched.length, 'file')}:`,
    );
    for (const { filepath } of result.touched) {
      logger.warn(filepath);
    }
  }

  if (result.errored.length) {
    logger.plain(`Flagged ${logger.pluralise(result.errored.length, 'file')}:`);
    for (const { err, filepath } of result.errored) {
      logger.warn(filepath, ...(err ? [inspect(err)] : []));
    }
  }

  return result.errored.length === 0;
};
