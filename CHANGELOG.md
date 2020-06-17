# skuba

## 3.7.0-beta.4

### Minor Changes

- 5c138fb: **configure:** Replace relocated dependencies

  `skuba configure` now replaces the following dependencies and updates their import paths via naive find-and-replace:

  - `@seek/koala → seek-koala`
  - `@seek/node-datadog-custom-metrics → seek-datadog-custom-metrics`
  - `@seek/skuba → skuba`
  - `@seek/skuba-dive → skuba-dive`

- b85b4b3: **init:** Configure initial Git commits and default remote

### Patch Changes

- 5ec72d5: **configure, init:** Avoid unnecessary file writes during templating
- 5753b38: **template/lambda-sqs-worker:** Drop `hot-shots` dependency
- 0c1e129: **configure, init:** Sort dependencies
- 93cdf6c: **template:** Redact `Authorization` headers in logs
- 65d6fe2: **template/private-npm-package:** Fix ReferenceError on init
- f36b136: **help:** Show `build-package` correctly
- bac749a: **init:** Validate initial GitHub fields
- 72c2e2c: **configure:** Reserve skuba-managed sections in ignore files
- b23bd23: **jest:** skuba is now usable as a preset

  ```javascript
  // jest.config.js

  const { testPathIgnorePatterns } = require('skuba/config/jest');

  module.exports = {
    // This can be used in place of ...require('skuba/config/jest')
    preset: 'skuba',

    // This is still necessary as Jest doesn't deep-merge presets
    testPathIgnorePatterns: [...testPathIgnorePatterns, '/test\\.ts'],
  };
  ```

- 2169513: **template/koa-rest-api:** Use Koala's error handler

## 3.6.0

### Minor Changes

- 79bbd5b: **template/private-npm-package:** Add new template

  The `private-npm-package` template replaces `smt init`.

  This change also defaults TypeScript's `moduleResolution` to `node`.
  This shouldn't break any existing consumers as it is the default resolution strategy for CommonJS.

### Patch Changes

- 6db893a: **template/koa-rest-api:** Remove unused function
- 41b5ba8: **init:** Redesign first prompt
- 4ced018: **cli:** Tweak prompt spacing and wording
- a908cb9: **template/koa-rest-api:** Pass through Gantry environment as ENVIRONMENT
- 7b0debb: **deps:** Bump bundled and template dependencies

  This includes TypeScript 3.9.5.

## 3.5.1

### Patch Changes

- 5e62e37: **format, lint:** Relax on Jest config files

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
