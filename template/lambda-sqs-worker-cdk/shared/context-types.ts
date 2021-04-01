/* eslint-disable new-cap */
import { Literal, Number, Record, Static, String, Union } from 'runtypes';

export const stageContext = Union(Literal('dev'), Literal('prod'));
export type StageContext = Static<typeof stageContext>;

export const envContext = Record({
  workerLambda: Record({
    name: String,
    environment: Record({
      SOMETHING: String,
    }).asReadonly(),
  }).asReadonly(),
  queue: Record({
    name: String,
    deadLetterQueue: Record({
      name: String,
      maxReceiveCount: Number,
    }).asReadonly(),
  }).asReadonly(),
  topic: Record({
    name: String,
  }).asReadonly(),
  kmsKey: Record({
    description: String,
    alias: String,
  }),
}).asReadonly();

export type EnvContext = Static<typeof envContext>;

export const globalContext = Record({
  appName: String,
}).asReadonly();

export type GlobalContext = Static<typeof globalContext>;
