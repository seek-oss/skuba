# eslint-config-skuba

## 7.2.0

### Minor Changes

- **lint:** Update file extension detection logic ([#2099](https://github.com/seek-oss/skuba/pull/2099))

  This resolves an issue where file extensions were not being appended to imports with multiple dots in their path, such as `.vocab` files.

## 7.1.2

### Patch Changes

- **skuba/no-sync-in-promise-iterable:** Reclassify `new Promise(executor)` as safe ([#2058](https://github.com/seek-oss/skuba/pull/2058))

- **skuba/no-sync-in-promise-iterable:** Support static `Array.from()`, `Array.fromAsync()`, `Array.of()` methods ([#2060](https://github.com/seek-oss/skuba/pull/2060))

## 7.1.1

### Patch Changes

- **skuba/no-sync-in-promise-iterable:** Exempt more scenarios ([#2024](https://github.com/seek-oss/skuba/pull/2024))
  - Files in a `/testing/` subdirectory or named `.test.ts`
  - Global object constructors like `new Map()` and `new Set()` (`new Promise(executor)` has been reclassified as unsafe)
  - Knex builders like `knex.builder().method()`
  - Nested spread identifiers like `fn(...iterable)`

- **skuba/no-sync-in-promise-iterable:** Improve warning location ([#2029](https://github.com/seek-oss/skuba/pull/2029))

  Previously, each warning was anchored to the underlying expression that may have thrown a synchronous error, which could be confusing to triage. The rule now emits each warning against the root argument to the static `Promise` method, and includes details about the underlying expression in its message.

## 7.1.0

### Minor Changes

- **deps:** typescript-eslint ^8.39.0 ([#1982](https://github.com/seek-oss/skuba/pull/1982))

- **lint:** Add `skuba/no-sync-in-promise-iterable` rule ([#1969](https://github.com/seek-oss/skuba/pull/1969))

  [`skuba/no-sync-in-promise-iterable`](https://seek-oss.github.io/skuba/docs/eslint-plugin/no-sync-in-promise-iterable.html) heuristically flags synchronous logic in the iterable argument of [static `Promise` methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise#static_methods) that could leave preceding promises dangling.

  ```typescript
  await Promise.allSettled([
    promiseReject() /* This will result in an unhandled rejection */,
    promiseResolve(syncFn() /* If this throws an error synchronously  */),
    //             ~~~~~~~~
    // syncFn() may synchronously throw an error and leave preceding promises dangling.
    // Evaluate synchronous expressions outside of the iterable argument to Promise.allSettled,
    // or safely wrap with the async keyword, Promise.try(), or Promise.resolve().then().
  ]);
  ```

  A [Promise](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs) that is not awaited and later moves to a rejected state is referred to as an unhandled rejection. When an unhandled rejection is encountered, a Node.js application that does not use process clustering will default to crashing out.

  This new rule defaults to the [`warn` severity](https://eslint.org/docs/latest/use/configure/rules#rule-severities) while we monitor feedback. Please share examples of false positives if you regularly run into them.

- **lint:** Error on custom getters and setters ([#2010](https://github.com/seek-oss/skuba/pull/2010))

  In [`eslint-config-seek@14.6.0`](https://github.com/seek-oss/eslint-config-seek/releases/tag/v14.6.0), the [`no-restricted-syntax`](https://eslint.org/docs/latest/rules/no-restricted-syntax) rule is now preconfigured to ban custom getters and setters. Engineers typically expect property access to be a safer operation than method or function invocation. Throwing an error from a getter can cause confusion and unhandled promise rejections, which can lead to a crash on the server side if [not appropriately configured](https://nodejs.org/api/process.html#event-unhandledrejection). See the [PR](https://github.com/seek-oss/eslint-config-seek/pull/227) for more information.

  ```diff
  const obj = {
  - get prop() {
  + prop() {
      throw new Error('Badness!');
    },
  };
  ```

  A custom getter may be occasionally prescribed as the recommended approach to achieve desired behaviour. For example, this syntax can define a [recursive object in Zod](https://zod.dev/v4#recursive-objects). In these rare scenarios, add an inline ignore and ensure that you do not throw an error within the getter.

  ```typescript
  import * as z from 'zod';

  const Category = z.object({
    name: z.string(),
    // eslint-disable-next-line no-restricted-syntax -- Zod recursive type
    get subcategories() {
      return z.array(Category);
    },
  });
  ```

## 7.0.2

### Patch Changes

- **lint:** Add file extensions to relative index imports ([#1955](https://github.com/seek-oss/skuba/pull/1955))

## 7.0.1

### Patch Changes

- **lint:** Prevent Jest config and setup files from being linted with extensions ([#1953](https://github.com/seek-oss/skuba/pull/1953))

## 7.0.0

### Major Changes

- Enforce file extensions in imports ([#1937](https://github.com/seek-oss/skuba/pull/1937))

  This enforces that file extensions be added to every import statement. This helps prepare for an eventual migration to ECMAScript Modules (ESM). You can read more about this in our [deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esm.html).

  > **Warning**: The initial lint after upgrading may take longer than usual to complete as the new rules need to analyze all import statements in your codebase.

  > **Note**: This rule may not catch all cases when using TypeScript path aliases except for 'src' aliases

  To opt out of the new rules, add the following to your `eslint.config.js`:

  ```js
  {
    rules: {
      'require-extensions/require-extensions': 'off',
      'require-extensions/require-index': 'off',
    },
  }
  ```

  If you are depending on `eslint-config-skuba` without using skuba, you may need to add the following config to `jest.config.ts` for it to recognise imports with extensions.

  ```ts
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  ```

## 6.1.1

### Patch Changes

- **deps:** eslint-config-seek 14.5.3 ([#1916](https://github.com/seek-oss/skuba/pull/1916))

## 6.1.0

### Minor Changes

- **deps:** eslint-config-seek 14.5.0 ([#1895](https://github.com/seek-oss/skuba/pull/1895))

## 6.0.0

### Major Changes

- **deps:** Drop support for Node.js 18.x ([#1874](https://github.com/seek-oss/skuba/pull/1874))

  Node.js 18 reached EOL in April 2025. **skuba**’s minimum supported version is now Node.js 20.9.0.

  For help upgrading projects to an LTS version of Node.js, reference the [`skuba migrate` document](https://seek-oss.github.io/skuba/docs/cli/migrate.html).

### Patch Changes

- **deps:** eslint-config-seek 14.4.0 ([#1842](https://github.com/seek-oss/skuba/pull/1842))

## 5.1.3

### Patch Changes

- **deps:** pin eslint-config-seek to 14.3.2 ([#1834](https://github.com/seek-oss/skuba/pull/1834))

  This change sets **skuba** to use a known-good version of its dependency set that doesn't clash with the use of `yarn --ignore-optional` in **skuba** projects.

  This yarn flag is not recommended by **skuba**. A future version of **skuba** will revert this change, effectively removing support for the flag.

## 5.1.2

### Patch Changes

- **deps:** eslint-config-seek ^14.3.2 ([#1830](https://github.com/seek-oss/skuba/pull/1830))

  This version pins `eslint-plugin-import-x` to an older version, due to compatibility issues with the **skuba** ecosystem.

## 5.1.1

### Patch Changes

- **deps:** eslint-config-seek ^14.3.1 ([#1822](https://github.com/seek-oss/skuba/pull/1822))

## 5.1.0

### Minor Changes

- Disable `@typescript-eslint/no-base-to-string` in tests ([#1765](https://github.com/seek-oss/skuba/pull/1765))

- **deps:** typescript-eslint 8.26 ([#1750](https://github.com/seek-oss/skuba/pull/1750))

  This bumps typescript-eslint to ^8.26.0 to support TypeScript 5.8

- Remove `eslint-plugin-tsdoc` ([#1766](https://github.com/seek-oss/skuba/pull/1766))

  This plugin is [currently incompatible](https://github.com/microsoft/tsdoc/issues/374) with our config.

- Revert to modern JavaScript language option defaults ([#1769](https://github.com/seek-oss/skuba/pull/1769))
  - `ecmaVersion: 5 => latest`
  - `sourceType: script => module`

  See [JavaScript language options](https://eslint.org/docs/latest/use/configure/language-options#specifying-javascript-options) for more information.

### Patch Changes

- Remove duplicate `@typescript-eslint` definitions ([#1766](https://github.com/seek-oss/skuba/pull/1766))

- **deps:** eslint-plugin-tsdoc ^0.4.0 ([#1749](https://github.com/seek-oss/skuba/pull/1749))

## 5.0.0

### Major Changes

- ESLint 9 + `typescript-eslint` 8 + `eslint-config-seek` 14 ([#1537](https://github.com/seek-oss/skuba/pull/1537))

  This major upgrade bundles the following changes:
  - Migration to flat config format

    See the [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide) for more information.

  - Some lint rules have been changed or renamed

    You will likely need to manually review and adjust your code after running ESLint.

  - `eslint-plugin-import` has been replaced with `eslint-plugin-import-x`

    To migrate, replace references to `eslint-plugin-import` with `eslint-plugin-import-x`, and `import/` rules with `import-x/`.

  Wider changes may be necessary if your project has a custom ESLint configuration. Refer to the following resources to get started:
  - [ESLint 9](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
  - [`typescript-eslint` 8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8)

### Minor Changes

- Disable `@typescript-eslint/only-throw-error` in test files ([#1689](https://github.com/seek-oss/skuba/pull/1689))

## 4.1.0

### Minor Changes

- **deps:** eslint-plugin-tsdoc 0.3.0 ([#1579](https://github.com/seek-oss/skuba/pull/1579))

- **deps:** @typescript/eslint ^7.14.1 ([#1596](https://github.com/seek-oss/skuba/pull/1596))

  This addresses compatibility with TypeScript 5.5

- **deps:** eslint-plugin-jest 28 ([#1538](https://github.com/seek-oss/skuba/pull/1538))

## 4.0.0

### Major Changes

- **deps:** eslint-config-seek 13 + typescript-eslint ^7.2.0 ([#1487](https://github.com/seek-oss/skuba/pull/1487))

  These major upgrades bump our minimum requirements:
  - Node.js >=18.18.0
  - ESLint >=8.56.0
  - TypeScript >=4.7.5

  See the [typescript-eslint v7 announcement](https://typescript-eslint.io/blog/announcing-typescript-eslint-v7/) for more information.
