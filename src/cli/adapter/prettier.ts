import fs from 'fs';
import path from 'path';
import { inspect } from 'util';

import { check, format, getFileInfo, resolveConfig } from 'prettier';

import { crawlDirectory } from '../../utils/dir';
import { Logger } from '../../utils/logging';
import { getConsumerManifest } from '../../utils/manifest';

interface Result {
  count: number;
  errored: Array<{ err: unknown; filepath: string }>;
  touched: string[];
  unparsed: string[];
  untouched: string[];
}

const formatFile = async (
  filepath: string,
  logger: Logger,
  mode: 'format' | 'lint',
  result: Result,
) => {
  logger.debug(filepath);

  const [config, data, fileInfo] = await Promise.all([
    resolveConfig(filepath),
    fs.promises.readFile(filepath, 'utf-8'),
    getFileInfo(filepath, { resolveConfig: false }),
  ]);

  const options = { ...config, filepath };

  const parser = fileInfo.inferredParser;

  logger.debug('  parser:', fileInfo.inferredParser ?? '-');

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
      result.errored.push({ err: 'Did not pass check', filepath });
    }

    result.untouched.push(filepath);
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
    result.untouched.push(filepath);
    return;
  }

  await fs.promises.writeFile(filepath, formatted);

  result.touched.push(filepath);
};

export const runPrettier = async (
  mode: 'format' | 'lint',
  logger: Logger,
): Promise<boolean> => {
  logger.debug('Initialising Prettier...');

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

  const result: Result = {
    count: filepaths.length,
    errored: [],
    touched: [],
    unparsed: [],
    untouched: [],
  };

  logger.debug('Processing files...');

  const start = process.hrtime.bigint();

  for (const filepath of filepaths) {
    await formatFile(filepath, logger, mode, result);
  }

  const end = process.hrtime.bigint();

  logger.plain(
    `Processed ${logger.pluralise(
      result.count - result.unparsed.length,
      'file',
    )} in ${logger.timing(start, end)}.`,
  );

  if (result.touched.length) {
    logger.plain('Changes:', result.touched.length);
    for (const file of result.touched) {
      logger.warn(file);
    }
  }

  if (result.errored.length) {
    logger.plain('Errors:', result.errored.length);
    for (const { err, filepath } of result.errored) {
      logger.err(filepath, inspect(err));
    }
  }

  return result.errored.length === 0;
};
