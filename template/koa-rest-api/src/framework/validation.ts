import { ErrorMiddleware } from 'seek-koala';
import type { core, z } from 'zod/v4';

import type { Context } from 'src/types/koa';

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
  Object.fromEntries(parseTuples(err.issues));

const parseTuples = (
  issues: core.$ZodIssue[],
): Array<readonly [string, string]> =>
  issues.flatMap((issue) => {
    if (issue.code === 'invalid_union') {
      return parseTuples(issue.errors.flat());
    }
    const path = ['', ...issue.path].join('/');

    return [[path, issue.message]] as const;
  });

export const validate = <Output, Input = Output>({
  ctx,
  input,
  schema,
}: {
  ctx: Context;
  input: unknown;
  schema: z.ZodSchema<Output, Input>;
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

export const validateRequestBody = <Output, Input = Output>(
  ctx: Context,
  schema: z.ZodSchema<Output, Input>,
): Output =>
  validate<Output, Input>({
    ctx,
    input: ctx.request.body as unknown,
    schema,
  });
