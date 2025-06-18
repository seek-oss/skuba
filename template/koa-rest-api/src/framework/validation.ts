import { ErrorMiddleware } from 'seek-koala';
import { ZodIssueCode, type z } from 'zod';

import type { Context } from 'src/types/koa.js';

type InvalidFields = Record<string, string>;

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
 *
 * For union errors, the path will be appended with `~union${unionIdx}` to indicate which union type failed.
 * @see [union error example](./validation.test.ts)
 */
const parseInvalidFieldsFromError = (err: z.ZodError): InvalidFields =>
  Object.fromEntries(parseTuples(err, {}));

const parseTuples = (
  { errors }: z.ZodError,
  unions: Record<number, number[]>,
): Array<readonly [string, string]> =>
  errors.flatMap((issue) => {
    if (issue.code === ZodIssueCode.invalid_union) {
      return issue.unionErrors.flatMap((err, idx) =>
        parseTuples(err, {
          ...unions,
          [issue.path.length]: [...(unions[issue.path.length] ?? []), idx],
        }),
      );
    }

    const path = ['', ...issue.path]
      .map((prop, idx) => [prop, ...(unions[idx] ?? [])].join('~union'))
      .join('/');

    return [[path, issue.message]] as const;
  });

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
    const invalidFields = parseInvalidFieldsFromError(parseResult.error);
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
