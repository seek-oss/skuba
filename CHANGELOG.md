# skuba

## 3.5.0-beta.2

### Patch Changes

- Learn to splice

## 3.5.0-beta.1

### Patch Changes

- ff26fb7: Fix assortment of PnP issues

## 3.5.0-beta.0

### Minor Changes

- 4f355c9: **build, format, lint:** Add experimental "support" for Yarn PnP
- 84a3262: ESLint 7 + `typescript-eslint` 3

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

### Patch Changes

- 3f4bb58: **configure, init:** Tweak ignore file patterns

  Directory names like `/lib-es2015` are ignored based on prefix now,
  but certain patterns have been restricted to the root to allow for `/src/lib`.

- 030ebb4: **configure:** Keep name, readme and version fields in package.json
- b61a3ca: **start:** Remove support for a custom port logging function
- 54961a5: **template/koa-rest-api:** Bump Gantry plugin to v1.2.2
- 6600c2f: **format, lint:** Group `'src'` import along with `'src/**'`
- 50a316f: **configure, init:** Exclude files from templating based on .gitignore
- 0d3f0ad: **build-package:** Add opinionated command to replace `smt build`

## 3.4.1

### Patch Changes

- ef3abbe: Release on `seek-oss`
