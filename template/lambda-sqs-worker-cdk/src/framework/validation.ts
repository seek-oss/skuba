import type * as z from 'zod/v4';

export const validateJson = <T extends z.ZodType>(
  input: string,
  schema: T,
): z.infer<T> => schema.parse(JSON.parse(input));
