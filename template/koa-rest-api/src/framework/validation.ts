import { ErrorMiddleware } from 'seek-koala';
import { ZodIssueCode, type z } from 'zod';

import type { Context } from 'src/types/koa';

type InvalidFields = Record<string, string[]>;
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
 * { "/advertiserId": ["advertiserId is required in the URL"] }
 * ```
 */
const parseInvalidFieldsFromError = (
  invalidFields: InvalidFields,
  { errors }: z.ZodError,
  unionIdx?: number,
) => {
  errors.map((err) => {
    if (err.code === ZodIssueCode.invalid_union) {
      err.unionErrors.map((unionError, idx) => {
        parseInvalidFieldsFromError(invalidFields, unionError, idx);
      });
    } else {
      const path = `/${err.path.join('/')}${
        unionIdx !== undefined ? `_${unionIdx}` : ''
      }`;
      const fieldError = invalidFields[path];
      if (fieldError) {
        fieldError.push(err.message);
        invalidFields[path] = fieldError;
      } else {
        invalidFields[path] = [err.message];
      }
    }
  });
};

export const validate = <
  Output,
  Def extends z.ZodTypeDef = z.ZodTypeDef,
  Input = Output,
>({
  ctx,
  input,
  schema,
}: {
  ctx: Context;
  input: unknown;
  schema: z.ZodSchema<Output, Def, Input>;
}): Output => {
  const parseResult = schema.safeParse(input);
  if (parseResult.success === false) {
    const invalidFields: InvalidFields = {};
    parseInvalidFieldsFromError(invalidFields, parseResult.error);
    return ctx.throw(
      422,
      new ErrorMiddleware.JsonResponse('Input validation failed', {
        message: 'Input validation failed',
        invalidFields,
      }),
    );
  }
  return parseResult.data;
};

export const validateRequestBody = <
  Output,
  Def extends z.ZodTypeDef = z.ZodTypeDef,
  Input = Output,
>(
  ctx: Context,
  schema: z.ZodSchema<Output, Def, Input>,
): Output =>
  validate<Output, Def, Input>({
    ctx,
    input: ctx.request.body as unknown,
    schema,
  });
