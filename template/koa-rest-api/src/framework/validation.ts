import { ErrorMiddleware } from 'seek-koala';
import type * as z from 'zod/v4';
import type * as core from 'zod/v4/core';

import type { Context } from '#src/types/koa.js';

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
  errors: core.$ZodIssue[],
  basePath: Array<string | number | symbol> = [],
  unions: Record<number, number[]> = {},
): Array<readonly [string, string]> =>
  errors.flatMap((issue) => {
    if (issue.code === 'invalid_union') {
      return issue.errors.flatMap((err, idx) =>
        parseTuples(err, issue.path, {
          ...unions,
          [issue.path.length]: [...(unions[issue.path.length] ?? []), idx],
        }),
      );
    }

    const path = ['', ...basePath, ...issue.path]
      .map((prop, idx) => [prop, ...(unions[idx] ?? [])].join('~union'))
      .join('/');

    return [[path, issue.message]] as const;
  });

export const validate = <T extends z.ZodType>({
  ctx,
  input,
  schema,
}: {
  ctx: Context;
  input: unknown;
  schema: T;
}): z.infer<T> => {
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

export const validateRequestBody = <T extends z.ZodType>(
  ctx: Context,
  schema: T,
): z.infer<T> =>
  validate({
    ctx,
    input: ctx.request.body,
    schema,
  });
