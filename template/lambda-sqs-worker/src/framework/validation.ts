import { z } from 'zod';

export const validateJson = <T>(input: string, type: z.ZodSchema<T>) =>
  type.parse(JSON.parse(input));
