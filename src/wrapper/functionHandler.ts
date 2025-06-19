import fnArgs from 'function-arguments';

import { log } from '../utils/logging.js';
import { isFunction, isObject } from '../utils/validation.js';

import {
  createRequestListenerFromFunction,
  serveRequestListener,
} from './http.js';

interface Args {
  availablePort?: number;
  entryPoint: unknown;
  functionName: string;
}

/**
 * Create an HTTP server that calls into an exported function.
 */
export const runFunctionHandler = async ({
  availablePort,
  entryPoint,
  functionName,
}: Args): Promise<void> => {
  if (!isObject(entryPoint)) {
    log.subtle(log.bold(functionName), 'is not exported');
    return;
  }

  const fn = entryPoint[functionName];

  if (!isFunction(fn)) {
    log.subtle(log.bold(functionName), 'is not a function');
    return;
  }

  log.warn(
    log.bold(functionName),
    `(${fnArgs(fn)
      // Add a `?` placeholder for unnamed arguments.
      .map((arg) => arg || '?')
      .join(', ')})`,
  );

  const requestListener = createRequestListenerFromFunction(fn);

  return serveRequestListener(requestListener, availablePort);
};
