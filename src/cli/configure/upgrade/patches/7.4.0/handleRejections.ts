import path from 'path';

import fs from 'fs-extra';

import { SERVER_LISTENER_FILENAME } from '../../../../lint/autofix';
import { createDestinationFileReader } from '../../../analysis/project';
import { formatPrettier } from '../../../processing/prettier';

export const handleRejections = async (dir: string) => {
  // TODO: should we describe what we are doing / link to detailed doco?

  const readFile = createDestinationFileReader(dir);

  let listener = await readFile(SERVER_LISTENER_FILENAME);

  if (!listener) {
    return;
  }

  // Assumption: `process.on('unhandledRejection')` would be set in a root file
  // like `src/app.ts` or `src/server.ts`.
  const rootSourceFiles = await fs.promises.readdir(path.join(dir, 'src'), {
    recursive: false,
  });

  for (const file of rootSourceFiles) {
    const contents = await readFile(path.join('src', file));

    if (contents?.includes("process.on('unhandledRejection')")) {
      return;
    }
  }

  const loggerVariable = /import { ([a-zA-Z]+logger) } from /i.exec(listener)?.[1]

  if (!loggerVariable) {
    return
  }

  listener = `${listener}

process.on('unhandledRejection', (err, promise) =>
  ${loggerVariable}.error({ err, promise }, 'Unhandled rejection'));
`;

  await fs.promises.writeFile(
    SERVER_LISTENER_FILENAME,
    await formatPrettier(listener, {
      parser: 'typescript',
    }),
  );
};
