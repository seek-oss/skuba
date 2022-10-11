import { ErrorMiddleware } from 'seek-koala';
import { z } from 'zod';

import { Context } from 'src/types/koa';

/**
 * Converts a `ZodError` into an `invalidFields` object
 *
 * For example, the `ZodError`:
 *
 * ```json
 * {
 *   "issues": [
 *     {
 *       "code": "invalid_type",
 *       "expected": "string",
 *       "received": "undefined",
 *       "path": ["advertiserId"],
 *       "message": "advertiserId is required in the URL"
 *     }
 *   ],
 *   "name": "ZodError"
 * }
 * ```
 *
 * Returns:
 *
 * ```json
 * { "/advertiserId": "advertiserId is required in the URL" }
 * ```
 */
const parseInvalidFieldsFromError = (err: z.ZodError): Record<string, string> =>
  err.errors.reduce(
    (prevValue, currentValue) => ({
      ...prevValue,
      [`/${currentValue.path.join('/')}`]: currentValue.message,
    }),
    {},
  );

export const validate = <T>({
  ctx,
  input,
  schema,
}: {
  ctx: Context;
  input: unknown;
  schema: z.ZodSchema<T>;
}) => {
  const parseResult = schema.safeParse(input);
  if (parseResult.success === false) {
    return ctx.throw(
      422,
      new ErrorMiddleware.JsonResponse('Input validation failed', {
        message: 'Input validation failed',
        invalidFields: parseInvalidFieldsFromError(parseResult.error),
      }),
    );
  }
  return parseResult.data;
};

export const validateRequestBody = <T>(
  ctx: Context,
  schema: z.ZodSchema<T>,
): T => validate<T>({ ctx, input: ctx.request.body as unknown, schema });
