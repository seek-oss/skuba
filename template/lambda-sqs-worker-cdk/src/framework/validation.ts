import type { z } from 'zod/v4';

export const validateJson = <Output, Input>(
  input: string,
  schema: z.ZodSchema<Output, Input>,
): Output => schema.parse(JSON.parse(input));
