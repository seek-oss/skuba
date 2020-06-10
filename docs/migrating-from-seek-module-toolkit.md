# Migrating from `seek-module-toolkit`

> Coming soon™️

## Table of contents

- [Building](#building)
- [Formatting and linting](#formatting-and-linting)

## Building

```shell
smt build → skuba build-package
```

`seek-module-toolkit` compiles your code to:

- `/lib/commonjs`: CommonJS module-compatible code
- `/lib/es2015`: ES2015 module-compatible code
- `/lib`: TypeScript types

This presents issues when referencing non-JS assets,
as the compiled code is nested one level deeper than the source code.

`skuba` compiles your code to:

- `/lib-commonjs`: CommonJS module-compatible code
- `/lib-es2015`: ES2015 module-compatible code
- `/lib-types`: TypeScript types

You should remove workarounds such as:

- Copying non-JS assets into `/lib` so that they are in the parent directory of the referencing code.

  You can include these assets directly in your `package.json#/files` array.

- Varying the referenced path of non-JS assets based on whether the code is source or compiled (i.e. using `__filename`).

## Formatting and linting

```shell
smt format → skuba format

smt format:check → skuba lint

smt lint → skuba lint
```

`seek-module-toolkit` retained support for [TSLint] configurations.
[TSLint is deprecated and will go out of support by December 2020.](https://github.com/palantir/tslint/issues/4534)

`skuba` enforces [ESLint] and bundles a more modern set of linting rules.
We've included some general tips below;
if you’re stucking on something, feel free to reach out in `#typescriptification`.

[eslint]: https://eslint.org/
[tslint]: https://palantir.github.io/tslint/

### Avoid `any` and `object`

Our ESLint configuration introduces stricter rules around unsafe type usage.

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
