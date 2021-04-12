/* eslint-disable new-cap */
import * as t from 'runtypes';

export const stageContext = t.Union(t.Literal('dev'), t.Literal('prod'));
export type StageContext = t.Static<typeof stageContext>;

export const envContext = t
  .Record({
    workerLambda: t
      .Record({
        reservedConcurrency: t.Number,
        environment: t
          .Record({
            SOMETHING: t.String,
          })
          .asReadonly(),
      })
      .asReadonly(),
  })
  .asReadonly();

export type EnvContext = t.Static<typeof envContext>;

export const globalContext = t
  .Record({
    appName: t.String,
  })
  .asReadonly();

export type GlobalContext = t.Static<typeof globalContext>;
