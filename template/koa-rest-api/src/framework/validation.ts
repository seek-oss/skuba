import { z } from 'zod';

import { Context } from 'src/types/koa';

export const validate = <T>({
  ctx,
  input,
  schema,
}: {
  ctx: Context;
  input: unknown;
  schema: z.ZodSchema<T>;
}) => {
  try {
    return schema.parse(input);
  } catch (err) {
    // TODO: consider providing structured error messages for your consumers.
    return ctx.throw(422, err instanceof Error ? err.message : String(err));
  }
};

export const validateRequestBody = <T>(
  ctx: Context,
  schema: z.ZodSchema<T>,
): T => validate<T>({ ctx, input: ctx.request.body as unknown, schema });
