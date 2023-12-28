import { ErrorMiddleware } from 'seek-koala';
import { ZodIssueCode, type z } from 'zod';

import type { Context } from 'src/types/koa';

type InvalidFields = Record<string, string>;
type UnionErrorIdx = number | undefined;
type FlattenedIssue = {
  issue: z.ZodIssue;
  parentPath: z.ZodIssue['path'];
  unionIdx?: UnionErrorIdx;
};

const getIssuePath = (
  parentPath: z.ZodIssue['path'] = [],
  currentIssuePath: z.ZodIssue['path'] = [],
  currentIssueUnionIdx: UnionErrorIdx,
) => {
  const path = [
    ...parentPath,
    ...(parentPath.length !== 0
      ? currentIssuePath.slice(parentPath.length, currentIssuePath.length)
      : currentIssuePath),
  ];
  if (currentIssueUnionIdx !== undefined) {
    path[path.length - 1] = `${
      path[path.length - 1] ?? ''
    }~union${currentIssueUnionIdx}`;
  }
  return path;
};

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
const parseInvalidFieldsFromError = ({ errors }: z.ZodError) => {
  const invalidFields: InvalidFields = {};
  const flattenedIssues: FlattenedIssue[] = errors.map((issue) => ({
    issue,
    parentPath: [],
    unionIdx: undefined,
  }));

  for (const { issue, parentPath, unionIdx } of flattenedIssues) {
    if (issue.code === ZodIssueCode.invalid_union) {
      issue.unionErrors.forEach((err, idx) => {
        err.errors.forEach((childIssue) => {
          flattenedIssues.push({
            parentPath: getIssuePath(
              parentPath,
              issue.path ?? childIssue.path,
              unionIdx,
            ),
            issue: childIssue,
            unionIdx: idx,
          });
        });
      });
    } else {
      const path = `/${getIssuePath(parentPath, issue.path, unionIdx).join(
        '/',
      )}`;
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
