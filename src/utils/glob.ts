import path from 'node:path';

import fs, { type GlobOptions } from 'fs-extra';

export const globFiles = async (
  pattern: string | readonly string[],
  opts: GlobOptions,
): Promise<string[]> => {
  const files: string[] = [];

  for await (const entry of fs.promises.glob(pattern, {
    ...opts,
    withFileTypes: true,
  })) {
    if (!entry.isFile()) {
      continue;
    }

    files.push(
      path.relative(
        typeof opts.cwd === 'string' ? opts.cwd : process.cwd(),
        path.join(entry.parentPath, entry.name),
      ),
    );
  }

  return files;
};
