import Koa from 'koa';

export type Context = Koa.ParameterizedContext<State>;

export type Middleware = Koa.Middleware<State>;

export interface State {
  skipRequestLogging?: boolean;
}
