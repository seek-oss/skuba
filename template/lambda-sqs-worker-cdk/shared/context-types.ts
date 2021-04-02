/* eslint-disable new-cap */
import * as t from 'runtypes';

export const stageContext = t.Union(t.Literal('dev'), t.Literal('prod'));
export type StageContext = t.Static<typeof stageContext>;

export const envContext = t
  .Record({
    workerLambda: t
      .Record({
        name: t.String,
        environment: t
          .Record({
            SOMETHING: t.String,
          })
          .asReadonly(),
      })
      .asReadonly(),
    queue: t
      .Record({
        name: t.String,
        deadLetterQueue: t
          .Record({
            name: t.String,
            maxReceiveCount: t.Number,
          })
          .asReadonly(),
      })
      .asReadonly(),
    topic: t
      .Record({
        name: t.String,
      })
      .asReadonly(),
    kmsKey: t.Record({
      description: t.String,
      alias: t.String,
    }),
  })
  .asReadonly();

export type EnvContext = t.Static<typeof envContext>;

export const globalContext = t
  .Record({
    appName: t.String,
  })
  .asReadonly();

export type GlobalContext = t.Static<typeof globalContext>;
