import stream from 'stream';

import Koa, { type Context } from 'koa';
import httpMocks, { type RequestMethod } from 'node-mocks-http';
import { vi } from 'vitest';

import createMockCookies, {
  type MockCookies,
} from '../createMockCookies/createMockCookies.js';

export interface MockContext extends Context {
  cookies: MockCookies;
  request: Context['request'] & {
    body?: unknown;
    rawBody?: string;
    session?: Record<string, unknown>;
  };
}

export interface Options<
  CustomProperties extends object,
  RequestBody = undefined,
> {
  url?: string;
  method?: RequestMethod;
  statusCode?: number;
  session?: Record<string, unknown>;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  state?: Record<string, unknown>;
  encrypted?: boolean;
  host?: string;
  requestBody?: RequestBody;
  rawBody?: string;
  throw?:
    | ((status: number, message?: string) => never)
    | ReturnType<typeof vi.fn>;
  redirect?: ((url: string) => void) | ReturnType<typeof vi.fn>;
  customProperties?: CustomProperties;
}

export default function createContext<
  CustomProperties extends object,
  RequestBody = undefined,
>(options: Options<CustomProperties, RequestBody> = {}) {
  const app = new Koa();

  const {
    cookies,
    method,
    statusCode,
    session,
    requestBody,
    rawBody = '',
    url = '/',
    host = 'test.com',
    encrypted = false,
    throw: throwFn = vi.fn(),
    redirect = vi.fn(),
    headers = {},
    state = {},
    customProperties = {},
  } = options;

  const extensions = {
    ...customProperties,
    throw: throwFn,
    session,
    redirect,
    state,
  };

  // In Koa 3, ctx.origin reflects the Origin header rather than being computed from protocol + host.
  // Set it automatically when host is provided and no explicit Origin header is given.
  const protocol = encrypted ? 'https' : 'http';
  const requestHeaders: Record<string, string> = {
    // Koa determines protocol based on the `Host` header.
    Host: host,
    ...headers,
  };

  // Only set Origin if not explicitly provided (case-insensitive check)
  const hasOriginHeader =
    'Origin' in requestHeaders || 'origin' in requestHeaders;
  if (!hasOriginHeader) {
    requestHeaders.Origin = `${protocol}://${host}`;
  }

  const req = httpMocks.createRequest({
    url,
    method,
    statusCode,
    session,
    headers: requestHeaders,
  });

  // Some functions we call in the implementations will perform checks for `req.encrypted`, which delegates to the socket.
  // MockRequest doesn't set a fake socket itself, so we create one here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  req.socket = new stream.Duplex() as any;
  Object.defineProperty(req.socket, 'encrypted', {
    writable: false,
    value: encrypted,
  });

  const res = httpMocks.createResponse();

  // Koa sets a default status code of 404, not the node default of 200
  // https://github.com/koajs/koa/blob/master/docs/api/response.md#responsestatus
  res.statusCode = 404;

  // This is to get around an odd behavior in the `cookies` library, where if `res.set` is defined, it will use an internal
  // node function to set headers, which results in them being set in the wrong place.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  res.set = undefined as any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  const context = app.createContext(req, res as any) as MockContext &
    CustomProperties;
  Object.assign(context, extensions);
  context.cookies = createMockCookies(cookies);

  // ctx.request.body is a common enough custom property for middleware to add that it's handy to just support it by default
  context.request.body = requestBody;
  context.request.rawBody = rawBody;

  return context as MockContext;
}
