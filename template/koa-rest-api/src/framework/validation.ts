import { ErrorMiddleware } from 'seek-koala';
import { ZodIssueCode, type z } from 'zod';

import type { Context } from 'src/types/koa';

type InvalidFields = Record<string, string>;
type UnionErrorIdx = number | undefined;
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

const parseInvalidFieldsFromError = ({ errors }: z.ZodError) => {
  const invalidFields: InvalidFields = {};
  const flattenedIssues: Array<[z.ZodIssue, UnionErrorIdx]> = errors.map(
    (issue) => [issue, undefined],
  );

  for (const [issue, unionIdx] of flattenedIssues) {
    if (issue.code === ZodIssueCode.invalid_union) {
      issue.unionErrors.forEach((err, idx) => {
        err.errors.forEach((childIssue) => {
          flattenedIssues.push([childIssue, idx]);
        });
      });
    } else {
      const path = `/${issue.path.join('/')}${
        unionIdx !== undefined ? `_union${unionIdx}` : ''
      }`;
      invalidFields[path] = issue.message;
    }
  }

  return invalidFields;
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
