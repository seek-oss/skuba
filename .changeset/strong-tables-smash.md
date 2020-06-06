---
'skuba': minor
---

ESLint 7 + `typescript-eslint` 3

This upgrade introduces stricter rules around `any` and `object` usage for type safety.

Consider the following alternatives:

- Use `unknown` for a value whose type is truly unknown. This is a type-safe alternative to `any` that the TypeScript ecosystem is moving towards.

  ```diff
  - const data = JSON.parse(str);
  + const data = JSON.parse(str) as unknown;
  ```

- Prove the value has a specific type using a [type guard](https://www.typescriptlang.org/docs/handbook/advanced-types.html#user-defined-type-guards) or runtime validation library.

  ```diff
  - const safeData = inputData as any;
  + const safeData = RuntimeValidator.check(inputData);
  ```

- Use `Record<PropertyKey, unknown>` to indicate an object with unknown properties.

  ```diff
  - const isObject = (data: unknown): data is object => { ... };
  + const isObject = (data: unknown): data is Record<PropertyKey, unknown> => { ... };
  ```

- Disable the specific ESLint rule for the problematic line.

  ```typescript
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
  const takeAnyBody = ctx.request.body;
  ```
