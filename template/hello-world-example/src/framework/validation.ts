import { Context } from 'src/types/koa';

export const validate = <T>({
  ctx,
  input,
  filter,
}: {
  ctx: Context;
  input: unknown;
  filter: (data: unknown) => T;
}) => {
  try {
    return filter(input);
  } catch (err) {
    // TODO: consider providing structured error messages for your consumers.
    return ctx.throw(422, err instanceof Error ? err.message : String(err));
  }
};

export const validateRequestBody = <T>(
  ctx: Context,
  filter: (input: unknown) => T,
): T => validate({ ctx, input: ctx.request.body as unknown, filter });
