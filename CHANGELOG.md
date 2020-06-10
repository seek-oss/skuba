# skuba

## 3.5.0

### Minor Changes

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

- 0d3f0ad: **build-package:** Add opinionated command to replace `smt build`

  See the [migration documentation](https://github.com/seek-oss/skuba/blob/master/docs/migrating-from-seek-module-toolkit.md) for more information.

### Patch Changes

- bef1b36: **init:** Restore `--silent` arg for `yarn add`
- 3f4bb58: **configure, init:** Tweak ignore file patterns

  Directory names like `/lib-es2015` are ignored based on prefix now,
  but certain patterns have been restricted to the root to allow for `/src/lib`.

- b39a0e0: **configure:** Use `latest-version` to check package versions
- 70ae29a: **configure, init:** Switch to oss `skuba-dive` package
- b44523a: Switch to `seek-datadog-custom-metrics` + `seek-koala`
- 030ebb4: **configure:** Keep name, readme and version fields in package.json
- a311624: **configure:** Drop `--ignore-optional` from `yarn install`
- b61a3ca: **start:** Remove support for a custom port logging function
- a311624: **init:** Drop `--ignore-optional --silent` from `yarn add`
- 54961a5: **template/koa-rest-api:** Bump Gantry plugin to v1.2.2
- 54211b2: **deps:** Declare `@types/jest` as a peer dependency
- 6600c2f: **format, lint:** Group `'src'` import along with `'src/**'`
- 50a316f: **configure, init:** Exclude files from templating based on .gitignore

## 3.4.1

### Patch Changes

- ef3abbe: Release on `seek-oss`
