import path from 'path';

import { runFunctionHandler } from './functionHandler';
import { runRequestListener } from './requestListener';

export const main = async (rawEntryPoint: string, rawPort: string) => {
  const availablePort = Number(rawPort) || undefined;

  // Support exported function targeting, e.g. `src/module.ts#callMeMaybe`
  const [modulePath, functionName] = path
    .join(process.cwd(), rawEntryPoint)
    .split('#', 2);

  // Load entry point as module
  const entryPoint: unknown = await import(modulePath);

  return functionName
    ? runFunctionHandler({ availablePort, entryPoint, functionName })
    : runRequestListener({ availablePort, entryPoint });
};
