---
parent: CLI
nav_order: 7
---

# Migrate

---

## skuba migrate help

Echoes the available **skuba** migrations.

```shell
skuba migrate help
```

---

## skuba migrate node

**skuba** includes migrations to upgrade your project to the [active LTS version] of Node.js.
This is intended to minimise effort required to keep up with annual Node.js releases.

The following files are scanned:

- `.node-version`
- `.nvmrc`
- `package.json`s
- `tsconfig.json`s
- Buildkite pipelines in `.buildkite/` directories
- CDK files in `infra/` directories
- Dockerfiles & Docker Compose files
- Serverless files

**skuba** may not be able to upgrade all projects,
and typically works best when a project closely matches a built-in [template].
Check your project for files that may have been missed,
review and test the modified code as appropriate before releasing to production,
and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.
Exercise particular caution with monorepos,
as some may have employed unique configurations that the migration has not accounted for.

The migration will attempt to proceed if your project:

- Specifies a Node.js version in `.node-version`, `.nvmrc`, and/or `package.json#/engines/node`

- Does not include a `package.json#/files` field

  This field implies that your project is an npm package.
  See below for considerations when manually upgrading npm packages.

- Specifies a project type in `package.json#/skuba/type` that is not `package`

  Well-known project types currently include `application` and `package`.
  While we intend to improve support for monorepo projects in a future version,
  you may enable migrations in the interim by setting your root `/package.json` project type to `root`.

**skuba** upgrades your `tsconfig.json`s in line with the official [Node Target Mapping] guidance.
`tsconfig.json`s contain two options that are linked to Node.js versions:

- `lib` configures the language features available to your source code.

  For example, including `ES2024` allows you to use the [`Object.groupBy()` static method].
  The features available in each new ECMAScript version are summarised on [node.green](https://node.green/).

- `target` configures the transpilation behaviour of the TypeScript compiler.

  Back-end applications typically synchronise `lib` with their Node.js runtime.
  In this scenario, there is no need to transpile language features and `target` can match the ECMAScript version in `lib`.

  On the other hand, you may wish to use recent language features when authoring your npm packages while retaining support for package consumers on older Node.js runtimes.
  In this scenario, see the note below on transpilation for npm packages.

As of **skuba** 14, for npm packages, we will attempt to upgrade your targets to be 1 major version behind the current LTS Node.js version.

For example, when upgrading a project to Node.js 24, we will upgrade npm packages to target Node.js 22.

To ensure accurate detection of npm packages, set the `skuba.type` field in your `package.json` to `package` for npm packages and `application` for applications.

The following fields are modified for npm packages:

- `package.json#/engines/node`

  The `engines` property propagates to your package consumers.
  For example, if you specify a minimum Node.js version of 22,
  it will prevent your package from being installed in a Node.js 20 environment:

  ```json
  {
    "engines": {
      "node": ">=22"
    }
  }
  ```

  Take care with the `engines` property of an npm package;
  modifications typically necessitate a new major release per [semantic versioning].

- `tsconfig.json#/target`

  Refer to the official [Node Target Mapping] guidance and ensure that the transpilation target corresponds to the minimum Node.js version in `engines`.

  For monorepo projects,
  check whether your npm packages inherit from another `tsconfig.json`.
  You may need to define explicit overrides for npm packages like so:

  ```diff
    {
  +   "compilerOptions": {
  +     "removeComments": false,
  +     "target": "ES2023" // Continue to support package consumers on Node.js 20
  +   },
      "extends": "../../tsconfig.json"
    }
  ```

`skuba format` and `skuba lint` will automatically run these migrations as [patches].

As of **skuba** 14, `skuba migrate` attempts to upgrade underlying infrastructure packages for compatibility with the new Node.js version. These include `aws-cdk-lib`, `datadog-cdk-constructs-v2`, `osls`, `serverless`, `serverless-plugin-datadog` and `@types/node`.

[`Object.groupBy()` static method]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy
[active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases
[Node Target Mapping]: https://github.com/microsoft/TypeScript/wiki/Node-Target-Mapping
[patches]: ./lint.md#patches
[semantic versioning]: https://semver.org/
[template]: ../templates/index.md

### skuba migrate node24

Attempts to automatically upgrade your project to Node.js 24 and your package targets to Node.js 22.14.0+.

```shell
skuba migrate node24
```

Node.js 24 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-24]
- The AWS [release announcement][aws-24] for the Lambda `nodejs24.x` runtime update

[aws-24]: https://aws.amazon.com/blogs/compute/node-js-24-runtime-now-available-in-aws-lambda/
[node-24]: https://nodejs.org/en/blog/release/v24.0.0

### skuba migrate node22

Attempts to automatically upgrade your project to Node.js 22.

```shell
skuba migrate node22
```

Node.js 22 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-22]
- The AWS [release announcement][aws-22] for the Lambda `nodejs22.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs22.x`,
and `@types/node` to major version `22`.

[aws-22]: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
[node-22]: https://nodejs.org/en/blog/announcements/v22-release-announce

### skuba migrate node20

Attempts to automatically upgrade your project to Node.js 20.

```shell
skuba migrate node20
```

Node.js 20 includes breaking changes.
For more information on the upgrade, refer to:

- The Node.js [release notes][node-20]
- The AWS [release announcement][aws-20] for the Lambda `nodejs20.x` runtime update

You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs20.x`,
and `@types/node` to major version `20`.

[aws-20]: https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/
[node-20]: https://nodejs.org/en/blog/announcements/v20-release-announce
[sku codemod]: https://seek-oss.github.io/sku/#/./docs/vitest?id=migrating-to-vitest
[migration steps]: ../deep-dives/esm.md#steps-to-migrate

## skuba migrate esm

Attempts to automatically migrate your project from CommonJS to ESM. Before running the migration, follow the [migration steps].

```shell
skuba migrate esm
```

The following changes are made:

- type `module` is added to `package.json` files
- CommonJS syntax is replaced with ESM syntax in source files, test files, and configuration files
- AWS CDK worker files are migrated to ESM format
- ESLint config files and Prettier config files are migrated to ESM format
- Jest is replaced with Vitest as the test runner
  - The [sku codemod] is run along with additional transformations to fix additional cases
  - `aws-sdk-client-mock-jest` → `aws-sdk-client-mock-vitest` + `@types/node`
  - `@shopify/jest-koa-mocks` → `@skuba-lib/vitest-koa-mocks` + `@types/node`
  - `--runInBand` → `--maxWorkers=1` in `package.json` test scripts and Buildkite pipelines
  - `jest.config.*ts` files are migrated to `vitest.config.ts` on a best-effort basis
  - Jest hooks are migrated to Vitest hooks on a best-effort basis

Due to the complexities of test code and configurations, the migration may not be able to modify all files in your project.

### Post Migration Steps

1. Run `skuba lint` and attempt to address any lint errors that may be caused by the migration. The most common failure points with `skuba test` runs can normally be addressed by fixing the lint errors first.

If you notice there are changes you can make prior to running the skuba migration, we suggest making those changes first and then re-running the migration for the ease of reviewing the migration changes.

If you notice any repeatable issues that the migration has not accounted for, please [open an issue] or reach out in #skuba-support.

2. Review `vitest.config.ts` migrations

Review your generated `vitest.config.ts` and Vitest setup files against the original `jest.config.ts` and Jest setup files to verify all configuration has been carried across, paying close attention to any custom settings or patterns that the migration may have missed. Once satisfied, delete the `jest.config.ts` and any Jest setup files.

The migration may also leave some manual steps for you to complete within your `vitest.config.ts` files, such as updating existing regexp patterns to glob patterns in your test configuration.

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    exclude: ['\\.int\\.test'], // TODO: Update these regexp pattern strings to globs
  },
});
```

These should be easily migrated by hand or with the assistance of an AI agent such as Copilot with a prompt such as

```txt
Address the TODO comments in vitest.config files
```

3. Run `skuba test` and attempt to address any test errors that may be caused by the migration

4. Run and deploy your project as normal, and monitor for any issues that may be caused by the migration.

5. If your project deploys a package, ensure you test the published package in a downstream project to confirm it works as expected.

#### FAQ and Tips

##### Jest spies no longer work after the migration

1. Run `pnpm dlx @skuba-lib/detect-invalid-spies .`

Spies work differently in Vitest compared to Jest. You can read more about the differences here in our [@skuba-lib/detect-invalid-spies documentation].

This will identify any spies in your code that may be broken by the migration. If there are any issues detected, you will need to address these before proceeding with the migration.

For other Jest-specific patterns, you can refer to the [migration guide] provided by Vitest for more information on how to migrate your tests.

##### Cannot find module 'some-module/type' or its corresponding type declarations.ts(2307)

The ESLint rule introduced in previous `skuba` versions would quit evaluating imports very early to avoid long ESLint run times which means a few imports may be now invalid imports in ESM. The fix is as simple as adding a `.js` extension to the end of the import path:

```diff
- import { type } from '@seek/some-module/lib-types/types/type.generated';
+ import { type } from '@seek/some-module/lib-types/types/type.generated.js';
```

##### Jest Dynalite

If you were using `jest-dynalite` for testing DynamoDB interactions, you will need to switch to [Vitest dynalite lite] which provides similar functionality for Vitest.

##### Coverage reports are different after the migration

Vitest transforms your code differently to Jest which may result in different coverage reports after the migration. You may need to experiment with placing `/* istanbul ignore */` comments in different places in your code to achieve the desired coverage report.

```diff
    transport:
-   /* istanbul ignore next */
      config.environment === 'local'
+       ? /* istanbul ignore next */ { target: 'pino-pretty' }
        : undefined,
```

We are unsure whether this is intended behaviour or if there is a bug in the Vitest Istanbul and v8 coverage providers.

You may also find some luck with using the `/* istanbul ignore start */` and `/* istanbul ignore end */` comments

For the keen observers, we have decided to ease the migration by firstly adopting the `istanbul` provider for coverage in Vitest instead of the default `v8` provider. The `v8` provider will be made the default in a future release once we have mostly migrated our codebase to ESM and can confirm it works as expected.

[@skuba-lib/detect-invalid-spies documentation]: https://github.com/seek-oss/skuba/tree/main/packages/detect-invalid-spies
[migration guide]: https://vitest.dev/guide/migration.html#jest
[open an issue]: https://github.com/seek-oss/skuba/issues/new
[Vitest dynalite lite]: https://github.com/yamatatsu/vitest-dynamodb-lite/tree/main/packages/vitest-dynamodb-lite
