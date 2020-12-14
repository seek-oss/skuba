import http from 'http';

import { isFunction, isObject } from '../utils/validation';

import { serveRequestListener } from './http';

// Express compatibility
interface FunctionConfig extends http.RequestListener {
  port?: number;
}

interface ObjectConfig {
  // Koa compatibility
  callback?: () => http.RequestListener;

  requestListener?: http.RequestListener;

  default?: unknown;
  port?: number;
}

const isConfig = (data: unknown): data is FunctionConfig | ObjectConfig =>
  isFunction(data) || isObject(data);

interface Args {
  availablePort?: number;
  entryPoint: unknown;
}

/**
 * Create an HTTP server that calls into an exported `http.RequestListener`.
 *
 * This supports Express and Koa applications out of the box.
 */
export const runRequestListener = ({ availablePort, entryPoint }: Args) => {
  if (!isConfig(entryPoint)) {
    // Assume an executable script with weird exports
    return;
  }

  let config = entryPoint;

  if (typeof config === 'object' && isConfig(config.default)) {
    // Prefer `export default` over `export =`
    config = config.default;
  }

  if (Object.keys(config).length === 0) {
    // Assume an executable script with no exports
    return;
  }

  const requestListener =
    typeof config === 'function'
      ? config
      : config.requestListener ?? config.callback?.();

  if (typeof requestListener === 'undefined') {
    // Assume an executable script with non-request listener exports
    return;
  }

  const port = config.port ?? availablePort;

  return serveRequestListener(requestListener, port);
};
