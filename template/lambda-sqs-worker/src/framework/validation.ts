import { z } from 'zod';

export const validateJson = <
  Output,
  Def extends z.ZodTypeDef = z.ZodTypeDef,
  Input = Output,
>(
  input: string,
  schema: z.ZodSchema<Output, Def, Input>,
): Output => schema.parse(JSON.parse(input));
