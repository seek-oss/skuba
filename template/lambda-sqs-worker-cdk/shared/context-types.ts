import { z } from 'zod';

export const stageContext = z.enum(['dev', 'prod']);
export type StageContext = z.infer<typeof stageContext>;

export const envContext = z
  .object({
    workerLambda: z
      .object({
        reservedConcurrency: z.number(),
        environment: z
          .object({
            SOMETHING: z.string(),
          })
          .transform((val) => Object.freeze(val)),
      })
      .transform((val) => Object.freeze(val)),
  })
  .transform((val) => Object.freeze(val));

export type EnvContext = z.infer<typeof envContext>;

export const globalContext = z
  .object({
    appName: z.string(),
  })
  .transform((val) => Object.freeze(val));

export type GlobalContext = z.infer<typeof globalContext>;
