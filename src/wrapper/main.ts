import path from 'path';

import { runFunctionHandler } from './functionHandler.ts';
import { runRequestListener } from './requestListener.ts';

export const main = async (rawEntryPoint: string, rawPort: string) => {
  const availablePort = Number(rawPort) || undefined;

  // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
  const [modulePath, functionName] = path
    .join(process.cwd(), rawEntryPoint)
    .split('#', 2);

  // Load entry point as module

  const entryPoint = (await import(modulePath as string)) as unknown;

  return functionName
    ? runFunctionHandler({ availablePort, entryPoint, functionName })
    : runRequestListener({ availablePort, entryPoint });
};
