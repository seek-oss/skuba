import { z } from 'zod';

export const StageContextSchema = z.enum(['dev', 'prod']);
export type StageContext = z.infer<typeof StageContextSchema>;

export const EnvContextSchema = z.object({
  workerLambda: z.object({
    reservedConcurrency: z.number(),
    environment: z.object({
      ENVIRONMENT: z.string(),
    }),
  }),
  sourceSnsTopicArn: z.string(),
});

export type EnvContext = z.infer<typeof EnvContextSchema>;

export const GlobalContextSchema = z.object({
  appName: z.string(),
});

export type GlobalContext = z.infer<typeof GlobalContextSchema>;
