import type Koa from 'koa';
import type { RequestLogging } from 'seek-koala';

export type Context = Koa.ParameterizedContext<State>;

export type Middleware = Koa.Middleware<State>;

export type State = RequestLogging.State;
