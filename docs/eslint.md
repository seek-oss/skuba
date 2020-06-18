# ESLint

[ESLint] is _the_ JavaScript linter.
You may be familiar with it from SEEK's frontend development toolkit,
[sku].

If you're coming from your own bespoke backend configuration or `seek-module-toolkit`,
you may have been using [TSLint].
[TSLint is deprecated and will go out of support by December 2020.]

Our ESLint configuration introduces stricter rules around unsafe type usage.
Here are some tips for making the move.

[eslint]: https://eslint.org/
[eslint guide]: ./eslint.md
[sku]: https://github.com/seek-oss/sku
[tslint]: https://palantir.github.io/tslint/
[tslint is deprecated and will go out of support by december 2020.]: https://github.com/palantir/tslint/issues/4534

## Avoid `any` and `object`

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
