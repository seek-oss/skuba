import { inspect } from 'util';

import { Git } from '../../../index.js';
import type { Logger } from '../../../utils/logging.js';
import { createDestinationFileReader } from '../../configure/analysis/project.js';
import type { InternalLintResult } from '../internal.js';

export const detectBadCodeowners = async (
  logger: Logger,
): Promise<InternalLintResult> => {
  const gitRoot = await Git.findRoot({ dir: process.cwd() });
  const reader = createDestinationFileReader(gitRoot ?? process.cwd());

  const annotations = (
    await Promise.all(
      ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'].map(
        async (filename) => {
          const lines = (await reader(filename))?.split('\n');

          if (lines?.some((line) => line.startsWith('- '))) {
            return [
              {
                message:
                  'CODEOWNERS file has a line starting with `- `. This is probably an autoformatting mistake, where your editor thinks this file is a markdown file and is trying to format a list item. Did you mean to use `*` instead?',
                path: filename,
              },
            ];
          }

          return [];
        },
      ),
    )
  )
    .flat()
    .toSorted((a, b) => a.path.localeCompare(b.path));

  annotations.forEach(({ path, message }) => {
    logger.warn(`${path}: ${message}`);
  });

  return {
    ok: annotations.length === 0,
    fixable: false,
    annotations,
  };
};

export const tryDetectBadCodeowners = async (
  _mode: 'format' | 'lint',
  logger: Logger,
): Promise<InternalLintResult> => {
  try {
    return await detectBadCodeowners(logger);
  } catch (err) {
    logger.warn('Failed to detect bad CODEOWNERS.');
    logger.subtle(inspect(err));

    return {
      ok: false,
      fixable: false,
      annotations: [],
    };
  }
};
