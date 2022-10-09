import { z } from 'zod';

export const validateJson = <T>(input: string, schema: z.ZodSchema<T>) =>
  schema.parse(JSON.parse(input));
