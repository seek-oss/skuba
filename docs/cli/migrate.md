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

## skuba migrate esm

Attempts to automatically migrate your project from CommonJS to ESM.

If you have `skuba` installed as a direct dependency, this migration runs automatically as part of `skuba format` and `skuba lint` in **skuba** 16. **It is recommended to use `skuba format` or `skuba lint` rather than running this migration directly.**

To run the migration directly (not recommended):

```shell
skuba migrate esm
```

You will need to manually install `vitest` and `@vitest/coverage-istanbul` as dev dependencies if you do not have `skuba` installed as a direct dependency.

```shell
pnpm add -DE vitest @vitest/coverage-istanbul
```

### Migration changes

The following changes are made:

- `"type": "module"` is added to `package.json` files
- CommonJS syntax is replaced with ESM syntax in source files, test files, and configuration files
  - `__dirname` and `__filename` are replaced with `import.meta.dirname` and `import.meta.filename`.
  - `module.exports` are replaced with `export default` or named exports as appropriate
  - `.json` imports are updated to include `with { type: 'json' }`
  - `require()` calls are replaced with `import` statements or dynamic `import()` as appropriate
- Datadog and OpenTelemetry instrumentation ESM imports are added to Dockerfiles
- AWS CDK worker and Serverless files are migrated to ESM format
- ESLint config files and Prettier config files are migrated to ESM format
- `vocab.config.js` is migrated to `vocab.config.cjs`
- Jest is replaced with Vitest as the test runner
  - The [sku codemod] is run along with additional transformations to fix additional cases
  - `aws-sdk-client-mock-jest` → `aws-sdk-client-mock-vitest` + `@types/node`
  - `@shopify/jest-koa-mocks` → `@skuba-lib/vitest-koa-mocks` + `@types/node`
  - `--runInBand` → `--maxWorkers=1` in `package.json` test scripts and Buildkite pipelines
  - `jest.config.*ts` files are migrated to `vitest.config.ts` on a best-effort basis
  - Jest hooks are migrated to Vitest hooks on a best-effort basis

Due to the complexities of test code and configurations, the migration may not be able to modify all files in your project.

[pre-migration steps]: ../deep-dives/esm.md#transitioning-to-esm
[sku codemod]: https://seek-oss.github.io/sku/#/./docs/vitest?id=migrating-to-vitest

### Post-migration steps

1. Run `skuba lint`

   Attempt to address any lint errors that may be caused by the migration.
   The most common failure points with `skuba test` runs can normally be addressed by fixing the lint errors first.

   If you notice there are changes you can make prior to running the skuba migration, we suggest making those changes first and then re-running the migration for the ease of reviewing the migration changes.

   If you notice any repeatable issues that the migration has not accounted for, please [open an issue], or if you work at SEEK, reach out in [#skuba-support].

2. Review `vitest.config.ts` migrations

   Review your generated `vitest.config.ts` and Vitest setup files against the original `jest.config.ts` and Jest setup files to verify all configuration has been carried across, paying close attention to any custom settings or patterns that the migration may have missed.
   Once satisfied, delete `jest.config.ts` and any Jest setup files.

   The migration may also leave some manual steps for you to complete within your `vitest.config.ts` files, such as updating existing regexp patterns to glob patterns in your test configuration.

   ```ts
   // vitest.config.ts
   export default defineConfig({
     test: {
       exclude: ['\\.int\\.test'], // TODO: Update these regexp pattern strings to globs
     },
   });
   ```

   These should be easy to migrate by hand, or by prompting an AI agent such as Copilot with:

   ```txt
   Address the TODO comments in vitest.config.ts files
   ```

3. Run `skuba test`

   Attempt to address any test errors that may be caused by the migration.

4. Run and deploy your project

   Monitor for any issues that may be caused by the migration.
   If your project deploys a package, ensure you test the published package in a downstream project to confirm it works as expected.

[#skuba-support]: https://slack.com/app_redirect?channel=C03UM9GBGET

### FAQ and tips

#### Jest spies no longer work

Run the following command:

```shell
pnpm dlx @skuba-lib/detect-invalid-spies .
```

This will identify any spies in your code that may be broken by the migration.
Address any issues detected before proceeding.

Spies work differently in Vitest compared to Jest.
You can read more about the differences in our [`@skuba-lib/detect-invalid-spies`] documentation.
For other Jest-specific patterns, refer to Vitest's [Migrating from Jest] guide.

#### Cannot find module 'some-module/type' or its corresponding type declarations.ts(2307)

The ESLint rule introduced in previous `skuba` versions would quit evaluating imports very early to avoid long ESLint run times,
which means it may have missed updating some imports for ESM compatibility.
The fix is as simple as adding a `.js` extension to the end of the import path:

```diff
- import { type } from '@seek/some-module/lib-types/types/type.generated';
+ import { type } from '@seek/some-module/lib-types/types/type.generated.js';
```

#### Jest setup files were not migrated

The migration may determine that some of your Jest setup files are redundant in Vitest and may not migrate them across.

This is because Vitest provides built-in support for environment variables in the `test` configuration of `vitest.config.ts`:

An example Jest setup file that is not migrated to an equivalent Vitest setup file:

```ts
// jest.setup.ts
process.env.ENVIRONMENT = 'test';
process.env.OTHER_ENVIRONMENT_VARIABLE = 'some value';

export {};
```

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    env: {
      ENVIRONMENT: 'test',
      OTHER_ENVIRONMENT_VARIABLE: 'some value',
    },
  },
});
```

#### Config consolidation

If you have multiple `jest.config.ts` files, you may be able to consolidate to a single `vitest.config.ts` file with multiple projects.

For example, if you have the following Jest config files:

- `jest.config.ts`
- `jest.config.int.ts` where integration tests must be run with `--runInBand` due to shared resources

You may be able to consolidate to a single `vitest.config.ts` file like so:

```ts
// vitest.config.ts
export default defineConfig(
  Vitest.mergePreset({
    ssr: {
      resolve: {
        conditions: ['@seek/YOUR_REPO/source'],
      },
    },
    test: {
      env: {
        ENVIRONMENT: 'test',
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            exclude: ['**/*.int.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'integration',
            fileParallelism: false, // Equivalent to --runInBand
            setupFiles: ['vitest.setup.int.ts'],
            include: ['**/*.int.test.ts'],
          },
        },
      ],
    },
  }),
);
```

#### Performance

By default, Vitest runs every test in isolation to provide a testing environment that is free of side effects.
However, this is not always necessary and can lead to slower test runs compared to Jest.

Follow Vitest's [Improving Performance] guide to optimise your configuration.

#### Jest error matchers no longer match

Vitest matches deeper than Jest so you may need to adjust your test assertions.
For example, `.toThrow()` allowed for loose error message matching in Jest, but may require a more precise expectation in Vitest:

```diff
- await expect(someFunction()).rejects.toThrow(new Error('some error message'));
+ await expect(someFunction()).rejects.toThrow('some error message'));
// or
+ await expect(someFunction()).rejects.toThrow(new ActualError('some error message'));
```

#### jest-dynalite

If you were using `jest-dynalite` to test DynamoDB interactions, [`vitest-dynamodb-lite`] provides similar functionality for Vitest.

The recommended `setupFiles` can slow down your test suite when run against all tests.
To avoid this, configure a dedicated project for test files that use Dynalite.

```ts
// vitest.config.ts
export default defineConfig(
  Vitest.mergePreset({
    ssr: {
      resolve: {
        conditions: ['@seek/YOUR_REPO/source'],
      },
    },
    test: {
      env: {
        ENVIRONMENT: 'test',
      },
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            exclude: ['**/*.dynalite.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'dynalite',
            setupFiles: ['vitest-dynamodb-lite'],
            include: ['**/*.dynalite.test.ts'],
          },
        },
      ],
    },
  }),
);
```

#### Datadog trace headers

You may notice Datadog trace headers being emitted in your test output after the migration.
Vitest runs tests in a more realistic environment which may cause some of your code to execute differently compared to Jest.

```diff
+ "x-datadog-parent-id": "6421394243863276142",
+ "x-datadog-sampling-priority": "-1",
+ "x-datadog-tags": "_dd.p.tid=69f895eb00000000,_dd.p.ksr=0",
+ "x-datadog-trace-id": "6421394243863276142",
```

You can suppress these headers by adding the following to your Vitest setup file:

```diff
  export default defineConfig({
    test: {
      env: {
        ENVIRONMENT: 'test',
+       DD_TRACE_ENABLED: 'false',
      },
    },
  });
```

#### esbuild

If you were using `esbuild` directly in your project, you may need to update your `esbuild` configuration for ESM compatibility.

Of note, you may need to update the `conditions`, `mainFields`, `format` and `external` or `plugins` options in your `esbuild` configuration to ensure that it correctly resolves ESM modules:

```diff
  esbuild.build({
    // ...
    conditions: [
      '@seek/YOUR_REPO/source',
+     'module',
    ],
+   mainFields: ['module', 'main'],
+   format: 'esm',

+   external: ['pino'],
    // or
+   plugins: [esbuildPluginPino()],
   });
```

#### Coverage reports are different

Vitest transforms your code differently to Jest which may result in different coverage reports after the migration.
You may need to experiment with placing `/* istanbul ignore */` comments in different places in your code to achieve the same coverage behaviour:

```diff
    transport:
-   /* istanbul ignore next */
      config.environment === 'local'
+       ? /* istanbul ignore next */ { target: 'pino-pretty' }
        : undefined,
```

You may also find some luck with using the `/* istanbul ignore start */` and `/* istanbul ignore end */` comments.

We are unsure whether this is intended behaviour or if there is a bug in the Vitest Istanbul and v8 coverage providers.
For the keen observers, we have decided to ease the migration by firstly adopting the `istanbul` provider for coverage in Vitest instead of the default `v8` provider. The `v8` provider will be made the default in a future release once more codebases have been migrated to ESM and we can confirm it works as expected.

[`@skuba-lib/detect-invalid-spies`]: https://github.com/seek-oss/skuba/tree/main/packages/detect-invalid-spies
[`vitest-dynamodb-lite`]: https://github.com/yamatatsu/vitest-dynamodb-lite/tree/main/packages/vitest-dynamodb-lite
[Improving Performance]: https://vitest.dev/guide/improving-performance.html
[Migrating from Jest]: https://vitest.dev/guide/migration.html#jest
[open an issue]: https://github.com/seek-oss/skuba/issues/new
