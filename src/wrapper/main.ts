import path from 'path';

import { runFunctionHandler } from './functionHandler.js';
import { runRequestListener } from './requestListener.js';

export const main = async (rawEntryPoint: string, rawPort: string) => {
  const availablePort = Number(rawPort) || undefined;

  // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
  const [modulePath, functionName] = path
    .join(process.cwd(), rawEntryPoint)
    .split('#', 2);

  // Load entry point as module
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const entryPoint = require(modulePath as string) as unknown;

  return functionName
    ? runFunctionHandler({ availablePort, entryPoint, functionName })
    : runRequestListener({ availablePort, entryPoint });
};
