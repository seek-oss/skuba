import { z } from 'zod';

export const stageContextSchema = z.enum(['dev', 'prod']);
export type StageContext = z.infer<typeof stageContextSchema>;

export const envContextSchema = z.object({
  workerLambda: z.object({
    reservedConcurrency: z.number(),
    environment: z.object({
      SOMETHING: z.string(),
    }),
  }),
});

export type EnvContext = z.infer<typeof envContextSchema>;

export const globalContextSchema = z.object({
  appName: z.string(),
});

export type GlobalContext = z.infer<typeof globalContextSchema>;
