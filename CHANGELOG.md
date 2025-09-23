# skuba

## 12.3.0

### Minor Changes

- **lint:** Add `minimumReleaseAge` and `minimumReleaseAgeExclude` to `pnpm-workspace.yaml` ([#2065](https://github.com/seek-oss/skuba/pull/2065))

  These security-focused settings were introduced in [pnpm v10.16](https://github.com/pnpm/pnpm/releases/tag/v10.16.0) to reduce the risk of installing compromised packages. They work by delaying installation of newly released dependencies, giving time for malicious versions to be discovered and removed from the registry.

  `minimumReleaseAge` specifies the number of minutes that must pass after a version is published before pnpm will install it. `minimumReleaseAgeExclude` allows you to bypass this restriction for trusted packages, and supports patterns as of [pnpm v10.17.0](https://github.com/pnpm/pnpm/releases/tag/v10.17.0).

  **Note:** You must be using pnpm v10.16 or later for `minimumReleaseAge` to work, and pnpm v10.17 or later for `minimumReleaseAgeExclude` patterns to work properly. With earlier versions of pnpm, these features will not function and pnpm will install any version without applying the minimum release age restrictions.

- **lint:** Set `ignorePatchFailures: false` to ensure pnpm patches don't fail silently ([#2067](https://github.com/seek-oss/skuba/pull/2067))

### Patch Changes

- **lint:** Reclassify `new Promise(executor)` as safe in `skuba/no-sync-in-promise-iterable` ([#2058](https://github.com/seek-oss/skuba/pull/2058))

- **lint:** Support static `Array.from()`, `Array.fromAsync()`, `Array.of()` methods in `skuba/no-sync-in-promise-iterable` ([#2060](https://github.com/seek-oss/skuba/pull/2060))

- **deps:** @octokit/types ^15.0.0 ([#2064](https://github.com/seek-oss/skuba/pull/2064))

## 12.2.0

### Minor Changes

- **lint:** Update Jest snapshot URLs ([#2049](https://github.com/seek-oss/skuba/pull/2049))

- **node, start:** Forward custom conditions to `tsx` ([#2023](https://github.com/seek-oss/skuba/pull/2023))

  The `skuba node` and `skuba start` commands now automatically pass custom conditions from `tsconfig.json` ([`customConditions`](https://www.typescriptlang.org/tsconfig/customConditions.html)) and command-line arguments ([`--conditions`](https://nodejs.org/api/cli.html#-c-condition---conditionscondition)) to the `tsx` runtime.

### Patch Changes

- **template/lambda-sqs-worker-cdk:** Remove --hotswap functionality ([#2026](https://github.com/seek-oss/skuba/pull/2026))

- **template/oss-npm-package:** Switch to pnpm/action-setup in workflows ([#2055](https://github.com/seek-oss/skuba/pull/2055))

- **template/lambda-sqs-worker-cdk:** Set worker memory to 512mb by default ([#2027](https://github.com/seek-oss/skuba/pull/2027))

- **lint:** Exempt more `skuba/no-sync-in-promise-iterable` scenarios ([#2024](https://github.com/seek-oss/skuba/pull/2024))
  - Files in a `/testing/` subdirectory or named `.test.ts`
  - Global object constructors like `new Map()` and `new Set()` (`new Promise(executor)` has been reclassified as unsafe)
  - Knex builders like `knex.builder().method()`
  - Nested spread identifiers like `fn(...iterable)`

- **lint:** Improve location of `skuba/no-sync-in-promise-iterable` warnings ([#2029](https://github.com/seek-oss/skuba/pull/2029))

- **test:** Prioritize file extensions in Jest `moduleNameMapper` resolution ([#2041](https://github.com/seek-oss/skuba/pull/2041))

## 12.1.1

### Patch Changes

- **node, start:** Revert forwarding custom conditions to tsx ([#2021](https://github.com/seek-oss/skuba/pull/2021))

## 12.1.0

### Minor Changes

- **lint:** Update `publicHoistPattern` list in `pnpm-workspace.yaml` ([#1959](https://github.com/seek-oss/skuba/pull/1959))

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

- **lint:** Enable stricter import validation with [`noUncheckedSideEffectImports`](https://www.typescriptlang.org/tsconfig/#noUncheckedSideEffectImports) ([#1982](https://github.com/seek-oss/skuba/pull/1982))

  Previously, TypeScript would not check side-effect imports:

  ```typescript
  import './made-up-module.js';
  ```

  Validation of these imports is now enabled by default in `skuba/config/tsconfig.json`. If you have a complex build process that produces assets that aren't known to TypeScript at time of linting, you may override the compiler option in your local `tsconfig.json` or include inline `// @ts-expect-error`s in your code.

- **format, lint:** Patch `src/listen.ts` entry points to handle `unhandledRejection`s ([#1978](https://github.com/seek-oss/skuba/pull/1978))

  A [Promise](https://nodejs.org/en/learn/asynchronous-work/discover-promises-in-nodejs) that is not awaited and later moves to a rejected state is referred to as an unhandled rejection. When an unhandled rejection is encountered, a Node.js application that does not use process clustering will default to crashing out.

  This patch adds a [`process.on('unhandledRejection')`](https://nodejs.org/api/process.html#event-unhandledrejection) listener to `src/listen.ts` server entry points to log rather than crash on such rejections. If your application uses a different entry point, consider adding code similar to the following sample to improve resilience:

  ```typescript
  // If you want to gracefully handle this scenario in AWS Lambda,
  // remove the default AWS Lambda listener which throws an error.
  // process.removeAllListeners('unhandledRejection');

  // Report unhandled rejections instead of crashing the process
  // Make sure to monitor these reports and alert as appropriate
  process.on('unhandledRejection', (err) =>
    logger.error(err, 'Unhandled promise rejection'),
  );
  ```

- **test:** Enable `--experimental-vm-modules` by default ([#1997](https://github.com/seek-oss/skuba/pull/1997))

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

- **deps:** TypeScript 5.9 ([#1982](https://github.com/seek-oss/skuba/pull/1982))

  This major release includes breaking changes. See the [TypeScript 5.9](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/) announcement for more information.

- **node, start:** Forward custom conditions to `tsx` ([#1996](https://github.com/seek-oss/skuba/pull/1996))

  The `skuba node` and `skuba start` commands now automatically pass custom conditions from `tsconfig.json` ([`customConditions`](https://www.typescriptlang.org/tsconfig/customConditions.html)) and command-line arguments ([`--conditions`](https://nodejs.org/api/cli.html#-c-condition---conditionscondition)) to the `tsx` runtime.

### Patch Changes

- **template/oss-npm-package:** actions/checkout v5 ([#2016](https://github.com/seek-oss/skuba/pull/2016))

- **template/\*-rest-api:** Uplift observability patterns ([#2001](https://github.com/seek-oss/skuba/pull/2001))

  Our Gantry templates have been revised to better support [Datadog logging](https://backstage.myseek.xyz/docs/default/component/sig-backend-tooling/guidance/logging/) and DORA metrics.

- **template/lambda-sqs-worker-cdk:** Use Datadog runtime layer ([#2018](https://github.com/seek-oss/skuba/pull/2018))

  This template historically configured the Datadog CDK Construct to exclude the Node.js Lambda layer with [`addLayers: false`](https://docs.datadoghq.com/serverless/libraries_integrations/cdk/#configuration). This ensured that the `datadog-lambda-js` and `dd-trace` dependency versions declared in `package.json` were the ones running in your deployed Lambda function.

  We are now recommending use of the Node.js Lambda layer to align with ecosystem defaults and simplify our build process. Renovate can be configured to keep versioning of the Node.js Lambda layer and `datadog-lambda-js` in sync, but the `dd-trace` version may drift over time. See the [`seek-oss/rynovate` PR](https://github.com/seek-oss/rynovate/pull/185) for implementation details.

- **template/lambda-sqs-worker-cdk:** Uplift observability patterns ([#2001](https://github.com/seek-oss/skuba/pull/2001))

  Our Lambda template has been revised to better support [Datadog logging](https://backstage.myseek.xyz/docs/default/component/sig-backend-tooling/guidance/logging/) and DORA metrics.

- **template/\*-rest-api:** seek-datadog-custom-metrics ^6.0.0 ([#2009](https://github.com/seek-oss/skuba/pull/2009))

- **template/lambda-sqs-worker-cdk:** Add partial batch failure handling ([#1924](https://github.com/seek-oss/skuba/pull/1924))

- **deps:** zod ^4.0.0 ([#1977](https://github.com/seek-oss/skuba/pull/1977))

- **node, start:** Replace `--require dotenv/config` with `--env-file-if-exists .env` ([#1968](https://github.com/seek-oss/skuba/pull/1968))

  This drops a third-party dependency for the [built-in Node.js option](https://nodejs.org/dist/latest-v22.x/docs/api/cli.html#--env-file-if-existsconfig).

- **template/\*-rest-api:** Handle `unhandledRejection`s ([#1978](https://github.com/seek-oss/skuba/pull/1978))

- **init:** Fix `normalize-package-data` error ([#2020](https://github.com/seek-oss/skuba/pull/2020))

  This fixes an error that previously occurred if you skipped the input prompt on our built-in Gantry & Lambda templates:

  ```console
  Error: Invalid name: "@seek/<%- serviceName %>"
      at ensureValidName
  ```

- **template/koa-rest-api:** koa 3.x ([#1974](https://github.com/seek-oss/skuba/pull/1974))

## 12.0.2

### Patch Changes

- **lint:** Add file extensions to relative index imports ([#1955](https://github.com/seek-oss/skuba/pull/1955))

## 12.0.1

### Patch Changes

- **lint:** Prevent Jest config and setup files from being linted with extensions ([#1953](https://github.com/seek-oss/skuba/pull/1953))

## 12.0.0

### Major Changes

- **deps:** eslint-config-skuba 7 ([#1937](https://github.com/seek-oss/skuba/pull/1937))

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

  If you are applying a custom `moduleNameMapper` to your Jest config, you may need to add the following to it for it to recognise imports with extensions.

  ```ts
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1',
    },
  ```

### Minor Changes

- **test:** Add support for imports using file extensions ([#1933](https://github.com/seek-oss/skuba/pull/1933))

### Patch Changes

- **template:** Use `mount-buildkite-agent` for Docker Buildkite plugins ([#1944](https://github.com/seek-oss/skuba/pull/1944))

  Previously, our templated Buildkite pipelines directly mounted `/usr/bin/buildkite-agent` for [Buildkite annotations](https://seek-oss.github.io/skuba/docs/deep-dives/buildkite.html#buildkite-annotations). This sidestepped a SEEK-specific [`buildkite-signed-pipeline`](https://github.com/buildkite/buildkite-signed-pipeline) wrapper that was not compatible with the default BusyBox Ash shell on Alpine Linux. Projects can now revert to the `mount-buildkite-agent` option with [signed pipelines](https://buildkite.com/docs/agent/v3/signed-pipelines) built in to the Buildkite agent.

  For the [Docker Buildkite plugin](https://github.com/buildkite-plugins/docker-buildkite-plugin/blob/v5.13.0/README.md#mount-buildkite-agent-optional-boolean):

  ```diff
  # .buildkite/pipeline.yml
  steps:
    - commands:
        - pnpm test
        - pnpm lint
      plugins:
        - *docker-ecr-cache
        - docker#v5.13.0:
            environment:
  -           - BUILDKITE_AGENT_ACCESS_TOKEN
              - GITHUB_API_TOKEN
  +         mount-buildkite-agent: true
            propagate-environment: true
            volumes:
  -           # Mount agent for Buildkite annotations.
  -           - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
              # Mount cached dependencies.
              - /workdir/node_modules

  ```

  For the [Docker Compose Buildkite plugin](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin/blob/v5.10.0/README.md#mount-buildkite-agent-run-only-boolean):

  ```diff
  # docker-compose.yml
  services:
    app:
  -   environment:
  -     - BUILDKITE_AGENT_ACCESS_TOKEN
  -     - GITHUB_API_TOKEN
      image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
      init: true
      volumes:
        - ./:/workdir
  -     # Mount agent for Buildkite annotations.
  -     - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
        # Mount cached dependencies.
        - /workdir/node_modules
  ```

  ```diff
  # .buildkite/pipeline.yml
  steps:
    - commands:
        - pnpm test
        - pnpm lint
      plugins:
        - *docker-ecr-cache
        - docker-compose#v5.10.0:
  +         environment:
  +           - GITHUB_API_TOKEN
  +         mount-buildkite-agent: true
            propagate-environment: true
            run: app
  ```

- **lint:** Avoid committing unchanged git-lfs files ([#1943](https://github.com/seek-oss/skuba/pull/1943))

  [Autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) on repositories using git-lfs can result in committing unchanged files, reverting lfs-tracked files to "normal" files. This is because of an underlying support for git-lfs in skuba's git library.

  This change treats all git-lfs files as unchanged, and so will never be committed.

## 11.1.0

### Minor Changes

- **deps:** Jest 30 ([#1905](https://github.com/seek-oss/skuba/pull/1905))

  This major release includes breaking changes. See the [Jest 30](https://jestjs.io/blog/2025/06/04/jest-30) announcement for more information.

  Notable changes that may affect your tests:
  - **Updated expect aliases**: Expect aliases have been removed which may affect your test assertions. Please run `skuba format` to update your test files automatically.
  - **Updated snapshot printing**: Jest have updated the way snapshots are printed, which may require you to update your snapshot tests. Some snapshots may remain poorly indented, and be updated over time when regenerated. You may opt to remove all snapshots (e.g. replace `toMatchInlineSnapshot(...)` with `toMatchInlineSnapshot()` and re-run the tests with `-u`).

  In this release, we have enabled the [global cleanup](https://jestjs.io/blog/2025/06/04/jest-30#globals-cleanup-between-test-files) feature by default. This automatically cleans up global state between test files, helping to prevent memory leaks and ensure test isolation.

  If you need to revert to the previous behavior, you can configure the `globalsCleanup` option in your `jest.config.ts` file:

  ```ts
  export default Jest.mergePreset({
    testEnvironmentOptions: {
      globalsCleanup: 'soft', // Jest default or `'off'` to disable completely
    },
  });
  ```

- **deps:** prettier ~3.6.0 ([#1935](https://github.com/seek-oss/skuba/pull/1935))

### Patch Changes

- **template/\*:** Migrate to Zod 4 ([#1930](https://github.com/seek-oss/skuba/pull/1930))

- **migrate:** Improve performance when scanning the filesystem ([#1928](https://github.com/seek-oss/skuba/pull/1928))

- **migrate:** Fix a bug which was resulting in some missed changes in `skuba migrate` ([#1929](https://github.com/seek-oss/skuba/pull/1929))

- **deps:** eslint-config-skuba 6.1.1 ([#1916](https://github.com/seek-oss/skuba/pull/1916))

- **template/\*:** Replace logger spies with [`@seek/logger` destination mocks](https://github.com/seek-oss/logger/blob/master/docs/testing.md) ([#1923](https://github.com/seek-oss/skuba/pull/1923))

- **deps:** @octokit/rest ^22.0.0 ([#1919](https://github.com/seek-oss/skuba/pull/1919))

- **init:** Use pnpm by default ([#1910](https://github.com/seek-oss/skuba/pull/1910))

## 11.0.1

### Patch Changes

- **lint, test:** Fix `Node16` module resolution compatibility ([#1894](https://github.com/seek-oss/skuba/pull/1894))

- **deps:** @octokit/graphql ^9.0.0 ([#1896](https://github.com/seek-oss/skuba/pull/1896))

- **deps:** eslint-config-seek 14.5.0 ([#1895](https://github.com/seek-oss/skuba/pull/1895))

- **GitHub.readFileChanges, GitHub.uploadFileChanges:** Allowing reading files from directories which are not the Git root ([#1897](https://github.com/seek-oss/skuba/pull/1897))

## 11.0.0

This major release of **skuba** has a few breaking changes, all of which should be relatively easy to adapt your codebase to. Read the full release notes for details.

Key changes of this version:

- `.npmrc` settings for pnpm projects will be attempted to be automatically migrated to `pnpm-workspace.yaml`. Particular attention is needed for monorepos; read on.
- Node.js 18.x is no longer supported.
- Templates now use [simplified npm private access](https://seek-oss.github.io/skuba/docs/deep-dives/npm.html).

### Major Changes

- **deps:** Drop support for Node.js 18.x ([#1874](https://github.com/seek-oss/skuba/pull/1874))

  Node.js 18 reached EOL in April 2025. **skuba**’s minimum supported version is now Node.js 20.9.0.

  For help upgrading projects to an LTS version of Node.js, reference the [`skuba migrate` document](https://seek-oss.github.io/skuba/docs/cli/migrate.html).

- **api:** Delete comment when `GitHub.putIssueComment` is called with a `null` body ([#1880](https://github.com/seek-oss/skuba/pull/1880))

  This can be used to have comments that are only present when there is useful information to show. This mode will only work when used in conjunction with `internalId`, for safety. See [the documentation](https://seek-oss.github.io/skuba/docs/development-api/github.html#putissuecomment) for more details.

  This change is marked as breaking change because `GitHub.putIssueComment` can now return `null` according to the types. This will only occur when `body` is `null`.

- **format, lint:** Migrate `pnpm` projects to store settings in `pnpm-workspace.yaml` instead of `.npmrc`. ([#1849](https://github.com/seek-oss/skuba/pull/1849))

  This change follows the `pnpm` recommendation in `pnpm` version 10.

  As part of this change:
  - `.npmrc` is back in **skuba**’s managed `.gitignore` section
  - **skuba** will attempt to delete `.npmrc` and migrate its contents to `pnpm-workspace.yaml`. If any custom settings are found, they will be added but commented out for you to review and fix.
  - **skuba** will attempt to migrate references to `.npmrc` in Buildkite pipelines and Dockerfiles
  - **skuba** will attempt to upgrade to pnpm 10, if not already on this major version.

  **skuba** may not be able to correctly migrate all projects. Check your project for changes that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

  **Important**: Monorepos with setups which do not run `skuba lint` in the workspace root will need manual action for this change. Either apply the changes by hand, or run `skuba format` locally in the workspace root to apply the changes.

### Minor Changes

- **template/\*:** Use simplified npm private access ([#1858](https://github.com/seek-oss/skuba/pull/1858))

  This change to templates removes [`private-npm`](https://github.com/seek-oss/private-npm-buildkite-plugin/) and [`aws-sm`](https://github.com/seek-oss/aws-sm-buildkite-plugin/) Buildkite plugins, instead using the `GET_NPM_TOKEN` environment variable helper.

  Read more at **skuba**’s new [npm guide](https://seek-oss.github.io/skuba/docs/deep-dives/npm.html).

- **format, lint:** Remove `cdk.context.json` from managed `.gitignore` ([#1851](https://github.com/seek-oss/skuba/pull/1851))

  AWS CDK generates a `cdk.context.json` file when running commands like `cdk synth` or `cdk deploy`. This file is [recommended to be included in source control](https://docs.aws.amazon.com/cdk/v2/guide/context.html#context_construct).

  If this change is incompatible with your project's setup, manually add `cdk.context.json` back to your `.gitignore` file, outside of the **skuba**-managed section.

- **lint:** Patch CDK snapshot tests to skip esbuild bundling ([#1844](https://github.com/seek-oss/skuba/pull/1844))

  Executing esbuild bundling during unit tests can be slow. This patch looks for `new App()` use in `infra` test files, and if found, replaces them with `new App({ context: { 'aws:cdk:bundling-stacks': [] } })`. This context instructs the AWS CDK to skip bundling for the test stack.

- **format:** Add `--force-apply-all-patches` flag ([#1847](https://github.com/seek-oss/skuba/pull/1847))

  The new `skuba format --force-apply-all-patches` flag will apply all patches, even if **skuba** does not detect that you are upgrading to a new version. This can be useful for addressing regressions that previous patches would have fixed but were added to the code later.

### Patch Changes

- **template/lambda-sqs-worker-cdk:** Update SQS queues to have a 14 day retention period ([#1859](https://github.com/seek-oss/skuba/pull/1859))

- **template/koa-rest-api:** opentelemetry dependencies 2.x and 0.200.x ([#1827](https://github.com/seek-oss/skuba/pull/1827))

- **template/lambda-sqs-worker-cdk:** Update test to skip esbuild bundling by using the AWS CDK context key `aws:cdk:bundling-stacks` ([#1844](https://github.com/seek-oss/skuba/pull/1844))

- **deps:** @octokit/types ^14.0.0 ([#1872](https://github.com/seek-oss/skuba/pull/1872))

- **template/lambda-sqs-worker-cdk:** Support expedited deployments ([#1883](https://github.com/seek-oss/skuba/pull/1883))

  This change to **skuba**’s CDK template allows skipping smoke tests when the Buildkite build that deploys the lambda has a `[skip smoke]` directive in the build message. See [`@seek/aws-codedeploy-hooks`](https://github.com/seek-oss/aws-codedeploy-hooks/tree/main/packages/hooks) for more details.

- **test:** Suppress warnings from `ts-jest` about `isolatedModules` ([#1862](https://github.com/seek-oss/skuba/pull/1862))

- **lint:** Add a missing log when detecting malformed CODEOWNERS files ([#1839](https://github.com/seek-oss/skuba/pull/1839))

- **deps:** semantic-release 24 ([#1874](https://github.com/seek-oss/skuba/pull/1874))

## 10.1.0

### Minor Changes

- **lint:** Automatically remove yarn `--ignore-optional` flags ([#1834](https://github.com/seek-oss/skuba/pull/1834))

  This flag is no longer templated by **skuba**, having moved to pnpm, but was in the past. The use of this flag has started causing issues with some dependencies which declare optional dependencies for different platforms when using compiled binaries, with each marked as optional (but at least one being required).

  This change uses heuristics, and may not find all use, or may remove false positives; you should review the changes.

### Patch Changes

- **deps:** pin eslint-config-seek to 14.3.2 ([#1834](https://github.com/seek-oss/skuba/pull/1834))

  This change sets **skuba** to use a known-good version of its dependency set that doesn't clash with the use of `yarn --ignore-optional` in **skuba** projects.

  This yarn flag is not recommended by **skuba**. A future version of **skuba** will revert this change, effectively removing support for the flag.

## 10.0.4

### Patch Changes

- **migrate:** Remove throw on not found `package.json` ([#1832](https://github.com/seek-oss/skuba/pull/1832))

## 10.0.3

### Patch Changes

- **deps:** eslint-config-seek ^14.3.2 ([#1830](https://github.com/seek-oss/skuba/pull/1830))

  This version pins `eslint-plugin-import-x` to an older version, due to compatibility issues with the **skuba** ecosystem.

## 10.0.2

### Patch Changes

- **migrate:** Remove auto upgrading `@types/node` version due to build pipeline constraints ([#1820](https://github.com/seek-oss/skuba/pull/1820))

## 10.0.1

### Patch Changes

- **migrate:** Check nearest `package.json` during Node.js version migrations ([#1818](https://github.com/seek-oss/skuba/pull/1818))

- **migrate:** Update `@types/node` in lock file during Node.js version migrations ([#1814](https://github.com/seek-oss/skuba/pull/1814))

## 10.0.0

### Major Changes

- **format, lint:** Migrate projects to Node.js 22 ([#1804](https://github.com/seek-oss/skuba/pull/1804))

  As of **skuba** 10, `skuba format` and `skuba lint` include patches that attempt to automatically migrate your project to the [active LTS version] of Node.js. This is intended to minimise effort required to keep up with annual Node.js releases.

  With each **skuba** upgrade that includes these patches, you can locally opt out of the migration by setting the `SKIP_NODE_UPGRADE` environment variable, running `skuba format`, and committing the result.

  Changes must be manually reviewed by an engineer before merging the migration output. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

  [active LTS version]: https://nodejs.org/en/about/previous-releases#nodejs-releases

- **migrate:** Introduce `skuba migrate node22` ([#1735](https://github.com/seek-oss/skuba/pull/1735))

  [`skuba migrate node22`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node22) attempts to automatically upgrade your project to Node.js 22. Changes must be manually reviewed by an engineer before committing the migration output. See [`skuba migrate node`](https://seek-oss.github.io/skuba/docs/cli/migrate.html#skuba-migrate-node) for more information on this feature and how to use it responsibly.

  **skuba** may not be able to upgrade all projects. Check your project for files that may have been missed, review and test the modified code as appropriate before releasing to production, and [open an issue](https://github.com/seek-oss/skuba/issues/new) if your project files were corrupted by the migration.

  Node.js 22 includes breaking changes. For more information on the upgrade, refer to:
  - The Node.js [release notes][node-22]
  - The AWS [release announcement][aws-22] for the Lambda `nodejs22.x` runtime update

  You may need to manually upgrade CDK and Serverless package versions as appropriate to support `nodejs22.x`.

  [aws-22]: https://aws.amazon.com/blogs/compute/node-js-22-runtime-now-available-in-aws-lambda/
  [node-22]: https://nodejs.org/en/blog/announcements/v22-release-announce

### Minor Changes

- **lint:** Flag CODEOWNERS files that appear to have been incorrectly formatted ([#1796](https://github.com/seek-oss/skuba/pull/1796))

  Some code editors incorrectly detect `CODEOWNERS` files as markdown files and re-format them as such, breaking their syntax. `skuba lint` now attempts to detect this scenario and flags the file as being incorrect.

- **deps:** Drop dependencies `validate-npm-package-name` and `libnpmsearch` ([#1809](https://github.com/seek-oss/skuba/pull/1809))

  These dependencies have been removed, replaced by `npm-registry-fetch`.

- **template/\*-rest-api:** Remove `seek:source:url` tag from gantry files ([#1797](https://github.com/seek-oss/skuba/pull/1797))

- **template/lambda-sqs-worker:** Remove template ([#1789](https://github.com/seek-oss/skuba/pull/1789))

  It is recommended to use the `lambda-sqs-worker-cdk` template instead.

- **deps:** TypeScript 5.8 ([#1750](https://github.com/seek-oss/skuba/pull/1750))

  This major release includes breaking changes. See the [TypeScript 5.7](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/) and [TypeScript 5.8](https://devblogs.microsoft.com/typescript/announcing-typescript-5-8/) announcements for more information.

### Patch Changes

- **configure:** Fix crash during detecting whether the working tree is clean ([#1737](https://github.com/seek-oss/skuba/pull/1737))

- **template/express-rest-api:** express 5 ([#1761](https://github.com/seek-oss/skuba/pull/1761))

- **init:** Skip malformed template files ([#1808](https://github.com/seek-oss/skuba/pull/1808))

  `skuba init` runs templates, either bundled or [BYO](https://seek-oss.github.io/skuba/docs/templates/byo.html), through a series of string templating and processing steps.

  Occasionally, binary files can include substrings that appear to be directives for skuba to translate the file contents, which may then proceed to crash.

  To work around this, `skuba init` now skips templating of a given file when encountering an error.

- **template/lambda-sqs-worker-cdk:** Add `git` to the base Docker image ([#1775](https://github.com/seek-oss/skuba/pull/1775))

- **template/lambda-sqs-worker-cdk:** Upgrade `aws-cdk` and `aws-cdk-lib` to `^2.167.1` ([#1740](https://github.com/seek-oss/skuba/pull/1740))

- **template/lambda-sqs-worker-cdk:** Upgrade to datadog-cdk-constructs-v2 2 ([#1799](https://github.com/seek-oss/skuba/pull/1799))

- **template/lambda-sqs-worker-cdk:** Fix failing unit test and add `start` command ([#1724](https://github.com/seek-oss/skuba/pull/1724))

- **deps:** ignore ^7.0.0 ([#1762](https://github.com/seek-oss/skuba/pull/1762))

- **deps:** prettier ~3.5.0 ([#1788](https://github.com/seek-oss/skuba/pull/1788))

- **deps:** esbuild ~0.25.0 ([#1787](https://github.com/seek-oss/skuba/pull/1787))

- **deps:** prettier ~3.4.0 ([#1751](https://github.com/seek-oss/skuba/pull/1751))

  This change may contain some formatting changes. Review the release notes: https://prettier.io/blog/2024/11/26/3.4.0.html

- **template/\*:** Upgrade to Node 22 ([#1789](https://github.com/seek-oss/skuba/pull/1789))

- **template:** Align with latest AWS tagging guidance ([#1782](https://github.com/seek-oss/skuba/pull/1782))

- **template/express-rest-api, template/koa-rest-api:** Drop support for `failOnScanFindings` for gantry 4 support ([#1759](https://github.com/seek-oss/skuba/pull/1759))

- **deps:** Drop `serialize-error` ([#1763](https://github.com/seek-oss/skuba/pull/1763))

- **template/\*-rest-api:** seek-jobs/gantry v4.0.0 ([#1785](https://github.com/seek-oss/skuba/pull/1785))

- **init:** Fix `pnpm dlx skuba init` usage ([#1793](https://github.com/seek-oss/skuba/pull/1793))

## 9.1.0

### Minor Changes

- **deps:** Drop `strip-ansi` dependency in favour of [`util.stripVTControlCharacters`](https://nodejs.org/api/util.html#utilstripvtcontrolcharactersstr) ([#1713](https://github.com/seek-oss/skuba/pull/1713))

- **lint, format, template:** Use pinned `pnpm` version in Dockerfiles ([#1714](https://github.com/seek-oss/skuba/pull/1714))

  This fixes an issue where `pnpm` commands in Dockerfiles incorrectly use the latest pnpm version instead of the pinned version.

### Patch Changes

- **template/lambda-sqs-worker-cdk:** Align template with Serverless template ([#1577](https://github.com/seek-oss/skuba/pull/1577))

  This adds the same boilerplate code available in `lambda-sqs-worker` along with Datadog integration.

- **deps:** libnpmsearch ^8.0.0 ([#1698](https://github.com/seek-oss/skuba/pull/1698))

## 9.0.1

### Patch Changes

- **lint, format:** Put back [logic](https://github.com/seek-oss/skuba/pull/1226/) which skips autofixing Renovate branches when there is no open pull request. ([#1699](https://github.com/seek-oss/skuba/pull/1699))

  Previously, this was put in place to prevent an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised. This was subsequently removed because Skuba's default autofix commits [were ignored by skuba's recommended renovate configuration](https://github.com/seek-oss/rynovate/pull/121).

  However, this has resulted in some build-rebase-build-rebase-... loops, and so the [Renovate config change has been reverted](https://github.com/seek-oss/rynovate/pull/125), and requires investigation before reinstating.

## 9.0.0

skuba 9 is a reasonably large release but it shouldn't be too much trouble to upgrade.

The main changes are:

- ESLint 9 and flat config migration (where `skuba format` should handle most of the work)
- Swapping out `ts-node` for `tsx`
- Some fixes in Buildkite & Docker files

Read the full changelog:

### Major Changes

- **deps:** ESLint 9 + `typescript-eslint` 8 ([#1537](https://github.com/seek-oss/skuba/pull/1537))

  This major upgrade bundles the following changes:
  - Migration to flat config format

    `skuba format` will attempt to migrate your existing `.eslintignore` and `.eslintrc.js` files to a flat `eslint.config.js` file.

    See the [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide) for more information.

  - Some lint rules have been changed or renamed

    You will likely need to manually review and adjust your code after running `skuba lint`.

  - `eslint-plugin-import` has been replaced with `eslint-plugin-import-x`

    To migrate, replace references to `eslint-plugin-import` with `eslint-plugin-import-x`, and `import/` rules with `import-x/`.

  Wider changes may be necessary if your project has a custom ESLint configuration. Refer to the following resources to get started:
  - [ESLint 9](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
  - [`typescript-eslint` 8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8)

- **node, start:** Replace `ts-node` with `tsx` ([#1623](https://github.com/seek-oss/skuba/pull/1623))

  `skuba node` and `skuba start` now use `tsx` instead of `ts-node` to execute TypeScript files.

  `tsx` improves support for ESM features like dynamic [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)s. However, if you use its REPL by running `skuba node` without any arguments, there are a couple regressions to note:
  - Static [`import`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) declarations are no longer supported. Use `require` and `await import()` instead.
  - Pasting code into the editor may be more finicky by default. Consider using [`.editor`](https://nodejs.org/en/learn/command-line/how-to-use-the-nodejs-repl#dot-commands) mode.

  `skuba node <file>` and `skuba start` should continue to work as expected, but we have marked this as a major upgrade as it is difficult to comprehensively test every scenario. We strongly recommend to manually verify usage of `skuba node` and `skuba start` when you upgrade.

### Minor Changes

- **format, lint:** Point Docker base images to AWS ECR Public and remove constant `--platform` arguments ([#1684](https://github.com/seek-oss/skuba/pull/1684))

  This updates references to `node:` or `python:` Docker images in your Dockerfiles and `docker-compose.yml` files to point to AWS ECR Public to avoid Docker Hub rate limiting. It also removes [constant `--platform` arguments](https://docs.docker.com/reference/build-checks/from-platform-flag-const-disallowed/) from Dockerfiles.

  ```diff
  - FROM --platform=arm64 node:20-alpine AS dev-deps
  + FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps
  ```

  Your Dockerfiles may not be set up to build multi-platform images, so keep in mind that building them locally on an Intel x86 laptop may not yield images that can execute on AWS Graviton instances.

- **format, lint:** Remove obsolete `version` field from `docker-compose.yml` files ([#1638](https://github.com/seek-oss/skuba/pull/1638))

- **format, lint, template:** Mount Buildkite `.npmrc` in `/tmp/` rather than `<workdir>/tmp/` ([#1693](https://github.com/seek-oss/skuba/pull/1693))

  This avoids accidental inclusion in Git commits or published artifacts, as per the original intent of this handling.

  ```diff
  - secrets: id=npm,src=tmp/.npmrc
  + secrets: id=npm,src=/tmp/.npmrc

  - output-path: tmp/
  + output-path: /tmp/
  ```

- **deps:** TypeScript 5.6 ([#1655](https://github.com/seek-oss/skuba/pull/1655))

  This major release includes breaking changes. See the [TypeScript 5.6](https://devblogs.microsoft.com/typescript/announcing-typescript-5-6/) announcement for more information.

- **format, lint:** Fix duplicated YAML merge keys in `.buildkite/` pipelines ([#1537](https://github.com/seek-oss/skuba/pull/1537))

  ```diff
  - - <<: *deploy
  -   <<: *docker
  + - <<: [*deploy, *docker]
      label: stuff
  ```

  This change supports standardised YAML parsing across tools such as ESLint; it should not functionally alter the behaviour of your build pipeline.

  The bundled patch is fairly conservative and will not attempt to migrate more complex scenarios, such as where there are other keys between the merge keys. Take care with preserving the order of merge keys when manually updating other occurrences.

  ```diff
  - - <<: *deploy
  + - <<: [*deploy, *docker]
      label: stuff
  -   <<: *docker
  ```

- **format, lint:** Remove [logic](https://github.com/seek-oss/skuba/pull/1226) to skip autofixing Renovate branches when there is no open pull request ([#1687](https://github.com/seek-oss/skuba/pull/1687))

  Previously, this was put in place to prevent an issue where a Renovate branch could get stuck in an `Edited/Blocked` state without a pull request being raised.

  skuba's default autofix commits are [now ignored](https://github.com/seek-oss/rynovate/pull/121) in our recommended Renovate configuration.

### Patch Changes

- **template/koa-rest-api:** Switch from `koa-bodyparser` to `@koa/bodyparser` ([#1605](https://github.com/seek-oss/skuba/pull/1605))

- **template/koa-rest-api:** Enable secure headers middleware by default ([#1601](https://github.com/seek-oss/skuba/pull/1601))

  See the [Koala documentation](https://github.com/seek-oss/koala/tree/be565a764ece9ec3802c2b6eeb3272cb77d1a695/src/secureHeaders) for more information.

- **template/lambda-sqs-worker-cdk:** Comply with AWS tagging guidance ([#1643](https://github.com/seek-oss/skuba/pull/1643))

- **api:** Truncate Buildkite annotations over 1 MiB to resolve `buildkite-agent` crash ([#1645](https://github.com/seek-oss/skuba/pull/1645))

- **deps:** validate-npm-package-name ^6.0.0 ([#1682](https://github.com/seek-oss/skuba/pull/1682))

- **deps:** normalize-package-data ^7.0.0 ([#1681](https://github.com/seek-oss/skuba/pull/1681))

- **deps:** esbuild ~0.24.0 ([#1671](https://github.com/seek-oss/skuba/pull/1671))

- **deps:** concurrently ^9.0.0 ([#1666](https://github.com/seek-oss/skuba/pull/1666))

- **template/lambda-sqs-worker-cdk:** Replace custom hooks with `@seek/aws-codedeploy-infra` ([#1644](https://github.com/seek-oss/skuba/pull/1644))

- **template:** Point Docker base images to AWS ECR Public and remove constant `--platform` arguments ([#1684](https://github.com/seek-oss/skuba/pull/1684))

## 8.2.1

### Patch Changes

- **template:** Remove JSON schema definitions from Buildkite pipeline files ([#1624](https://github.com/seek-oss/skuba/pull/1624))

  This reverts [#1611](https://github.com/seek-oss/skuba/pull/1611) due to incompatibility with pipeline signing.

- **template:** docker-compose v5.3.0 ([#1620](https://github.com/seek-oss/skuba/pull/1620))

- **template/lambda-sqs-worker-cdk:** Fix deploy:hotswap script ([#1616](https://github.com/seek-oss/skuba/pull/1616))

- **deps:** esbuild 0.23 ([#1610](https://github.com/seek-oss/skuba/pull/1610))

## 8.2.0

### Minor Changes

- **format, lint:** Set `package-manager-strict-version=true` for pnpm projects ([#1572](https://github.com/seek-oss/skuba/pull/1572))

### Patch Changes

- **configure:** Fix `[object Object]` output appearing during `skuba configure` ([#1597](https://github.com/seek-oss/skuba/pull/1597))

- **template/koa-rest-api:** Clean up `src/app.test.ts` ([#1606](https://github.com/seek-oss/skuba/pull/1606))

- **template:** Add JSON schema definitions to Buildkite pipeline files ([#1611](https://github.com/seek-oss/skuba/pull/1611))

- **deps:** @octokit/rest ^21.0.0 ([#1599](https://github.com/seek-oss/skuba/pull/1599))

## 8.1.0

### Minor Changes

- **lint:** Skip generation of config files when present in `.gitignore` ([#1554](https://github.com/seek-oss/skuba/pull/1554))

  `skuba lint` and `skuba format` now skip the generation of config files, like `.dockerignore` and `.npmrc`, if they are ignored by `.gitignore` files.

- **deps:** esbuild 0.21 ([#1569](https://github.com/seek-oss/skuba/pull/1569))

- **deps:** TypeScript 5.5 ([#1596](https://github.com/seek-oss/skuba/pull/1596))

  This major release includes breaking changes. See the [TypeScript 5.5](https://devblogs.microsoft.com/typescript/announcing-typescript-5-5/) announcement for more information.

- **api:** Add Git.isFileGitIgnored ([#1554](https://github.com/seek-oss/skuba/pull/1554))

- **lint:** Add coverage to .prettierignore ([#1552](https://github.com/seek-oss/skuba/pull/1552))

- **configure:** Accept template data from stdin to allow for integration testing ([#1558](https://github.com/seek-oss/skuba/pull/1558))

- **lint:** Swap out `detect-package-manager` for manual lockfile detection ([#1552](https://github.com/seek-oss/skuba/pull/1552))

  `detect-package-manager` has been removed, in lieu of using `find-up` to detect the closest
  `pnpm-lock.yaml` or `yarn.lock` to infer the package manager.

- **lint:** Patch installing specific pnpm version via Corepack ([#1534](https://github.com/seek-oss/skuba/pull/1534))

- **deps:** prettier 3.3 ([#1580](https://github.com/seek-oss/skuba/pull/1580))

### Patch Changes

- **template:** Add extension recommendations to `.vscode/extensions.json` ([#1556](https://github.com/seek-oss/skuba/pull/1556))

- **Git:** Explicitly declare return types to enable compatibility with the `Node16` module ([#1589](https://github.com/seek-oss/skuba/pull/1589))

- **template/oss-npm-package:** Skip excessive action runs ([#1586](https://github.com/seek-oss/skuba/pull/1586))

- **template/lambda-sqs-worker-cdk:** Add worker config file ([#1548](https://github.com/seek-oss/skuba/pull/1548))

- **lint:** Exclude `.vscode/extensions.json` from being ignored by `.gitignore` ([#1556](https://github.com/seek-oss/skuba/pull/1556))

- **template:** Make all configuration values explicit ([#1560](https://github.com/seek-oss/skuba/pull/1560))

  Previously, `src/config.ts` included optional configuration values and inheritance between environments in the spirit of [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself). While the templated file was wired up in a "safe" way—the production environment never inherited from other environments and explicitly specified all its configuration values—its pattern was misappropriated elsewhere and led to local configuration values affecting production environments.

  Instead, we now list all configuration values explicitly against each environment.

- **template:** Remove deprecated `docker-compose.yml` version ([#1570](https://github.com/seek-oss/skuba/pull/1570))

  Docker has ignored this for a while, and now generates a warning on every build:
  https://github.com/compose-spec/compose-spec/blob/master/04-version-and-name.md

- **template/\*-rest-api:** Clean up templated environment variables ([#1562](https://github.com/seek-oss/skuba/pull/1562))
  - `AWS_NODEJS_CONNECTION_REUSE_ENABLED` is no longer required with AWS SDK V3.
  - The `env` boilerplate in Gantry values files was largely unnecessary and confusing.

    Our templates prefer to declare configuration values directly in `src/config.ts`.

## 8.0.1

### Patch Changes

- **deps:** eslint 8.56.0 ([#1521](https://github.com/seek-oss/skuba/pull/1521))

  This upgrade is required for [eslint-config-seek 13](https://github.com/seek-oss/eslint-config-seek/releases/tag/v13.0.0).

- **template:** Install specific pnpm version via Corepack ([#1515](https://github.com/seek-oss/skuba/pull/1515))

  Previously, our Dockerfiles ran `corepack enable pnpm` without installing a specific version. This does not guarantee installation of the pnpm version specified in `package.json`, which could cause a subsequent `pnpm install --offline` to run Corepack online or otherwise hang on stdin:

  ```dockerfile
  FROM --platform=arm64 node:20-alpine

  RUN corepack enable pnpm
  ```

  ```json
  {
    "packageManager": "pnpm@8.15.4",
    "engines": {
      "node": ">=20"
    }
  }
  ```

  ```console
  Corepack is about to download https://registry.npmjs.org/pnpm/-/pnpm-8.15.4.tgz.

  Do you want to continue? [Y/n]
  ```

  To avoid this issue, modify (1) Buildkite pipelines to cache on the [`packageManager` property](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin/releases/tag/v2.2.0) in `package.json`, and (2) Dockerfiles to mount `package.json` and run `corepack install`:

  ```diff
  - seek-oss/docker-ecr-cache#v2.1.0:
  + seek-oss/docker-ecr-cache#v2.2.0:
      cache-on:
       - .npmrc
  +    - package.json#.packageManager
       - pnpm-lock.yaml
  ```

  ```diff
  FROM --platform=arm64 node:20-alpine

  - RUN corepack enable pnpm
  + RUN --mount=type=bind,source=package.json,target=package.json \
  + corepack enable pnpm && corepack install
  ```

- **template/\*-rest-api:** Fix lint failure ([#1514](https://github.com/seek-oss/skuba/pull/1514))

  This resolves the following failure on a newly-initialised project due to a regression in the `@types/express` dependency chain:

  ```console
  error TS2688: Cannot find type definition file for 'mime'.
    The file is in the program because:
      Entry point for implicit type library 'mime'
  ```

  A temporary workaround is to install `mime` as a dev dependency.

- **deps:** @octokit/types ^13.0.0 ([#1536](https://github.com/seek-oss/skuba/pull/1536))

- **template/lambda-sqs-worker-cdk:** Align dead letter queue naming with Serverless template ([#1542](https://github.com/seek-oss/skuba/pull/1542))

- **Jest.mergePreset:** Fudge `Bundler` module resolution ([#1513](https://github.com/seek-oss/skuba/pull/1513))

  This extends [#1481](https://github.com/seek-oss/skuba/pull/1481) to work around a `ts-jest` issue where test cases fail to run.

- **template/oss-npm-package:** Set timeout to 20 minutes for GitHub Actions ([#1501](https://github.com/seek-oss/skuba/pull/1501))

- **template/lambda-sqs-worker-cdk:** Replace CDK context based config with TypeScript config ([#1541](https://github.com/seek-oss/skuba/pull/1541))

## 8.0.0

This version of skuba looks more scary than it is. The major change is that our dependencies have bumped their minimum Node.js requirement from 18.12 to 18.18. Most SEEK projects do not pin minor Node.js versions and are unlikely to be affected by this change.

In the spirit of upgrades, we recently refreshed our [ARM64 migration guide](https://seek-oss.github.io/skuba/docs/deep-dives/arm64.html#migrating-an-existing-project) and also have [one for pnpm](https://seek-oss.github.io/skuba/docs/deep-dives/pnpm.html). A previous release landed a [`skuba migrate`](https://seek-oss.github.io/skuba/docs/cli/migrate.html) command to simplify upgrades to Node.js 20 (active LTS) before Node.js 18 reaches EOL in April 2025.

### Major Changes

- **deps:** eslint-config-seek 13 + eslint-config-skuba 4 + typescript-eslint ^7.2.0 ([#1487](https://github.com/seek-oss/skuba/pull/1487))

  These major upgrades bump our minimum requirement from Node.js 18.12 to 18.18.

  See the [typescript-eslint v7 announcement](https://typescript-eslint.io/blog/announcing-typescript-eslint-v7/) for more information, and consider upgrading your project to the active LTS release with [`skuba migrate`](https://seek-oss.github.io/skuba/docs/cli/migrate.html) before Node.js 18 reaches EOL in April 2025.

### Minor Changes

- **deps:** semantic-release 22 ([#1492](https://github.com/seek-oss/skuba/pull/1492))

- **deps:** TypeScript 5.4 ([#1491](https://github.com/seek-oss/skuba/pull/1491))

  This major release includes breaking changes. See the [TypeScript 5.4](https://devblogs.microsoft.com/typescript/announcing-typescript-5-4/) announcement for more information.

### Patch Changes

- **template:** Remove `BUILDPLATFORM` from Dockerfiles ([#1350](https://github.com/seek-oss/skuba/pull/1350))

  Previously, the built-in templates made use of [`BUILDPLATFORM`](https://docs.docker.com/build/guide/multi-platform/#platform-build-arguments) and a fallback value:

  ```dockerfile
  FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs20-debian11
  ```

  1. Choose the platform of the host machine running the Docker build. An [AWS Graviton](https://aws.amazon.com/ec2/graviton/) Buildkite agent or Apple Silicon laptop will build under `arm64`, while an Intel laptop will build under `amd64`.
  2. Fall back to `arm64` if the build platform is not available. This maintains compatibility with toolchains like Gantry that lack support for the `BUILDPLATFORM` argument.

  This approach allowed you to quickly build images and run containers in a local environment without emulation. For example, you could `docker build` an `arm64` image on an Apple Silicon laptop for local troubleshooting, while your CI/CD solution employed `amd64` hardware across its build and runtime environments. The catch is that your local `arm64` image may exhibit different behaviour, and is unsuitable for use in your `amd64` runtime environment without cross-compilation.

  The built-in templates now hardcode `--platform` as we have largely converged on `arm64` across local, build and runtime environments:

  ```dockerfile
  FROM --platform=arm64 gcr.io/distroless/nodejs20-debian11
  ```

  This approach is more explicit and predictable, reducing surprises when working across different environments and toolchains. Building an image on a different platform will be slower and rely on emulation.

- **Jest.mergePreset:** Fudge `Node16` and `NodeNext` module resolutions ([#1481](https://github.com/seek-oss/skuba/pull/1481))

  This works around a `ts-jest` issue where test cases fail to run if your `moduleResolution` is set to a modern mode:

  ```json
  {
    "compilerOptions": {
      "moduleResolution": "Node16 | NodeNext"
    }
  }
  ```

  ```console
  error TS5110: Option 'module' must be set to 'Node16' when option 'moduleResolution' is set to 'Node16'.
  error TS5110: Option 'module' must be set to 'NodeNext' when option 'moduleResolution' is set to 'NodeNext'.
  ```

- **pkg:** Exclude `jest/*.test.ts` files ([#1481](https://github.com/seek-oss/skuba/pull/1481))

- **template:** Remove account-level tags from resources ([#1494](https://github.com/seek-oss/skuba/pull/1494))

  This partially reverts [#1459](https://github.com/seek-oss/skuba/pull/1459) and [#1461](https://github.com/seek-oss/skuba/pull/1461) to avoid unnecessary duplication of account-level tags in our templates.

## 7.5.1

### Patch Changes

- **template/lambda-sqs-worker:** Comply with latest AWS tagging guidance ([#1461](https://github.com/seek-oss/skuba/pull/1461))

- **GitHub.putIssueComment:** Support `userId: 'seek-build-agency'` ([#1474](https://github.com/seek-oss/skuba/pull/1474))

  The `userId` parameter is an optimisation to skip user lookup. A descriptive constant is now supported on SEEK build agents:

  ```diff
  await GitHub.putIssueComment({
    body,
  - userId: 87109344, // https://api.github.com/users/buildagencygitapitoken[bot]
  + userId: 'seek-build-agency',
  });
  ```

- **deps:** Remove `why-is-node-running` ([#1476](https://github.com/seek-oss/skuba/pull/1476))

  [`why-is-node-running`](https://www.npmjs.com/package/why-is-node-running) was previously added to the skuba CLI to troubleshoot scenarios where commands were timing out in CI. This has now been removed to avoid disruption to commands such as [`jest --detectOpenHandles`](https://jestjs.io/docs/cli#--detectopenhandles).

- **deps:** Remove `fdir` ([#1463](https://github.com/seek-oss/skuba/pull/1463))

  This dependency is no longer used internally.

- **template/\*-rest-api:** Comply with latest AWS tagging guidance ([#1459](https://github.com/seek-oss/skuba/pull/1459))

  This includes an upgrade to Gantry v3.

- **deps:** @octokit/graphql ^8.0.0 ([#1473](https://github.com/seek-oss/skuba/pull/1473))

- **deps:** @octokit/graphql-schema ^15.3.0 ([#1473](https://github.com/seek-oss/skuba/pull/1473))

## 7.5.0

### Minor Changes

- **cli:** Add 30-minute timeout to skuba commands in CI to avoid potential hanging builds. ([#1444](https://github.com/seek-oss/skuba/pull/1444))

  If there are use cases this breaks, please file an issue. A `SKUBA_NO_TIMEOUT` environment variable is supported on all commands to use the old behaviour. Timeout duration can be adjusted with a `SKUBA_TIMEOUT_MS` environment variable.

- **migrate:** Introduce `skuba migrate node20` to automatically upgrade a project's Node.js version ([#1382](https://github.com/seek-oss/skuba/pull/1382))

  `skuba migrate node20` will attempt to automatically upgrade projects to Node.js 20. It will look in the project root for Dockerfiles, `.nvmrc`, and Serverless files, as well as CDK files in `infra/` and `.buildkite/` files, and try to upgrade them to a Node.js 20 version.

  skuba might not be able to upgrade all projects, so please check your project for any files that skuba missed. It's possible that skuba will modify a file incorrectly, in which case please [open an issue](https://github.com/seek-oss/skuba/issues/new).

  Node.js 20 comes with its own breaking changes, so please read the [Node.js 20 release notes](https://nodejs.org/en/blog/announcements/v20-release-announce) alongside the skuba release notes. In addition,
  - For AWS Lambda runtime updates to `nodejs20.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.
  - You may need to upgrade your versions of CDK and Serverless as appropriate to support nodejs20.x.

### Patch Changes

- **lint:** Remove `Dockerfile-incunabulum` rule ([#1441](https://github.com/seek-oss/skuba/pull/1441))

  Previously, `skuba lint` would search for and delete a file named `Dockerfile-incunabulum` to correct a historical issue that had it committed to source control. This rule has been removed as the file has been cleaned up from most SEEK repositories.

- **template/lambda-sqs-worker-cdk:** Update tests to use a stable identifier for the `AWS::Lambda::Version` logical IDs in snapshots. This avoid snapshot changes on unrelated source code changes. ([#1450](https://github.com/seek-oss/skuba/pull/1450))

- **deps:** picomatch ^4.0.0 ([#1442](https://github.com/seek-oss/skuba/pull/1442))

## 7.4.1

### Patch Changes

- **lint:** Fix issue where `skuba lint` would fail in `gutenberg` projects due to the existence of `Dockerfile-incunabulum` files ([#1439](https://github.com/seek-oss/skuba/pull/1439))

## 7.4.0

This version of skuba should not require significant upgrade effort for most projects, but it does contain some notable changes:

- Internal linting and patching have been overhauled to streamline code generation on version upgrades.

  To make upgrades easy now and going forward, we recommend setting up [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes).

- New projects will now be initialised with pnpm, along with improved pnpm support.

  A future release of skuba may transition existing projects to pnpm.

Continue reading for more details on these changes and other improvements in this release.

### Minor Changes

- **lint:** Overhaul internal linting system ([#1370](https://github.com/seek-oss/skuba/pull/1370))

  Previously, internal lint rules would not fail a `skuba lint` check but would silently make changes to your working tree. These changes may have never been committed and may have caused subsequent noise when running `skuba format` or `skuba lint`.

  Now, internal linting is now promoted to a top-level tool alongside ESLint, Prettier, and tsc. Rules will report whether changes need to be made, and changes will only be applied in `format` or autofix modes (in CI). As a consequence, `skuba lint` may fail upon upgrading to this version if your project has internal lint violations that have been left unaddressed up to this point.

  You can configure `skuba lint` to automatically push autofixes; this eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`. You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.

- **format:** Switch Distroless image from `nodejs-debian11` to `nodejs-debian12` ([#1381](https://github.com/seek-oss/skuba/pull/1381))

- **deps:** Prettier 3.2 ([#1384](https://github.com/seek-oss/skuba/pull/1384))

  See the [release notes](https://prettier.io/blog/2024/01/12/3.2.0) for more information.

- **init:** Initialise new projects with [pnpm](https://pnpm.io/) ([#1289](https://github.com/seek-oss/skuba/pull/1289))

  New projects based on built-in templates will now use pnpm as their package manager as per updated organisational guidance.

  Custom templates will continue to default to Yarn 1.x until a future major version, though you can opt in to pnpm via `skuba.template.js`:

  ```diff
  module.exports = {
  + packageManager: 'pnpm',
  };
  ```

- **lint:** Manage `.npmrc` for pnpm projects ([#1413](https://github.com/seek-oss/skuba/pull/1413))

  skuba now manages a section of `.npmrc` when a project uses `pnpm` to enable [dependency hoisting](https://pnpm.io/npmrc#dependency-hoisting-settings). It will continue to avoid committing autofixes to the file if it contains auth secrets.

- **deps:** TypeScript 5.3 ([#1324](https://github.com/seek-oss/skuba/pull/1324))

  This major release includes breaking changes. See the [TypeScript 5.3](https://devblogs.microsoft.com/typescript/announcing-typescript-5-3/) announcement for more information.

- **lint:** Manage `.dockerignore` ([#1433](https://github.com/seek-oss/skuba/pull/1433))

  skuba now manages a section of `.dockerignore` for you, ensuring that the file is up to date with the latest enhancements in skuba.

- **init:** Default to `arm64` platform and `main` branch ([#1343](https://github.com/seek-oss/skuba/pull/1343))

- **init:** Run Prettier after templating ([#1337](https://github.com/seek-oss/skuba/pull/1337))

- **init:** Support `main` default branch ([#1335](https://github.com/seek-oss/skuba/pull/1335))

- **lint:** Introduce skuba patches ([#1274](https://github.com/seek-oss/skuba/pull/1274))

  This feature adds patches which are run only once on the `lint` or `format` commands following a skuba update. If your build pipeline is utilising [autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes), these changes will be pushed up automatically.

### Patch Changes

- **lint:** Disable `Promise<void>` return checks in tests ([#1366](https://github.com/seek-oss/skuba/pull/1366))

  This works around an [existing incompatibility](https://github.com/koajs/koa/issues/1755) between Koa and the built-in `http.RequestListener` type:

  ```typescript
  const app = new Koa();

  const agent = supertest.agent(app.callback());
  //                            ~~~~~~~~~~~~~~
  // Promise returned in function argument where a void return was expected.
  // @typescript-eslint/no-misused-promises
  ```

- **deps:** picomatch ^3.0.0 ([#1309](https://github.com/seek-oss/skuba/pull/1309))

- **Jest:** Export `Config` type ([#1360](https://github.com/seek-oss/skuba/pull/1360))

  This resolves a TypeScript error that could present itself when using `Jest.mergePreset` with the [`declaration`](https://www.typescriptlang.org/tsconfig#declaration) compiler option:

  > TS4082: Default export of the module has or is using private name `ConfigGlobals`.

- **template/lambda-sqs-worker:** Remove `@aws-sdk/util-utf8-node` library ([#1326](https://github.com/seek-oss/skuba/pull/1326))

- **build, build-package, test:** Remove empty export synthesis for Jest setup files ([#1274](https://github.com/seek-oss/skuba/pull/1274))

  [`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) was enabled by default in [v5.0.0](https://github.com/seek-oss/skuba/releases/tag/v5.0.0). To ease this migration, the commands listed above were updated to dynamically synthesise an empty export for `jest.setup.ts` and `jest.setup.int.ts` files; this compatibility logic has now been removed.

  Up-to-date projects are unlikely to be affected, but you can easily add an empty export statement to placate the TypeScript compiler:

  ```console
  jest.setup.ts(1,1): error TS1208: 'jest.setup.ts' cannot be compiled under '--isolatedModules' because it is considered a global script file. Add an import, export, or an empty 'export {}' statement to make it a module.
  ```

  ```diff
  process.env.ENVIRONMENT = 'test';

  + export {};
  ```

- **template/lambda-sqs-worker-cdk:** Switch to `aws-cdk-lib/assertions` ([#1372](https://github.com/seek-oss/skuba/pull/1372))

- **template/\*-rest-api:** Set `readonlyRootFilesystem` as a security best practice ([#1394](https://github.com/seek-oss/skuba/pull/1394))

- **template:** Use `propagate-environment` for Docker Compose Buildkite plugin ([#1392](https://github.com/seek-oss/skuba/pull/1392))

  This simplifies the Docker Compose environment variable configuration required for Buildkite and GitHub integrations.

  In your `docker-compose.yml`:

  ```diff
  services:
    app:
  -   environment:
  -     # Enable Buildkite + GitHub integrations.
  -     - BUILDKITE
  -     - BUILDKITE_AGENT_ACCESS_TOKEN
  -     - BUILDKITE_BRANCH
  -     - BUILDKITE_BUILD_NUMBER
  -     - BUILDKITE_JOB_ID
  -     - BUILDKITE_PIPELINE_DEFAULT_BRANCH
  -     - BUILDKITE_STEP_ID
  -     - GITHUB_API_TOKEN
      image: ${BUILDKITE_PLUGIN_DOCKER_IMAGE:-''}
      init: true
      volumes:
        - ./:/workdir
        # Mount agent for Buildkite annotations.
        - /usr/bin/buildkite-agent:/usr/bin/buildkite-agent
        # Mount cached dependencies.
        - /workdir/node_modules
  ```

  In your `.buildkite/pipeline.yml`:

  ```diff
  steps:
    - commands:
        - pnpm lint
        - pnpm test
      env:
        # At SEEK, this instructs the build agent to populate the GITHUB_API_TOKEN environment variable for this step.
        GET_GITHUB_TOKEN: 'please'
      plugins:
        - *aws-sm
        - *private-npm
        - *docker-ecr-cache
        - docker-compose#v4.16.0:
  +         environment:
  +           - GITHUB_API_TOKEN
  +         propagate-environment: true
            run: app
  ```

- **template/\*-rest-api:** Disable dev CloudWatch dashboards for cost savings ([#1395](https://github.com/seek-oss/skuba/pull/1395))

- **template/lambda-sqs-worker-cdk:** Add blue-green deployment, smoke test and version pruning functionality ([#1327](https://github.com/seek-oss/skuba/pull/1327))

- **template/lambda-sqs-worker\*:** Set [maximum concurrency](https://aws.amazon.com/blogs/compute/introducing-maximum-concurrency-of-aws-lambda-functions-when-using-amazon-sqs-as-an-event-source/) ([#1412](https://github.com/seek-oss/skuba/pull/1412))

  This prevents messages from going directly to the DLQ when the function reaches its reserved concurrency limit.

- **template/koa-rest-api:** Improve input validation error response for Zod unions ([#1339](https://github.com/seek-oss/skuba/pull/1339))

- **template/lambda-sqs-worker-cdk:** Introduce bundling with esbuild, `--hotswap` and `--watch` ([#1321](https://github.com/seek-oss/skuba/pull/1321))

  This template now uses the `aws_lambda_nodejs.NodejsFunction` construct which uses esbuild to bundle the Lambda function. This [reduces cold start time](https://aws.amazon.com/blogs/developer/reduce-lambda-cold-start-times-migrate-to-aws-sdk-for-javascript-v3/) and time to build on CI.

  The `--hotswap` and `--watch` options allow you to rapidly deploy your code changes to AWS, enhancing the developer feedback loop. This change introduces `deploy:hotswap` and `deploy:watch` scripts to the `package.json` manifest and a `Deploy Dev (Hotswap)` step to the Buildkite pipeline. Read more about watch and hotswap [on the AWS Developer Tools Blog](https://aws.amazon.com/blogs/developer/increasing-development-speed-with-cdk-watch/).

## 7.3.1

### Patch Changes

- **deps:** Prettier 3.1 ([#1314](https://github.com/seek-oss/skuba/pull/1314))

  See the [release notes](https://prettier.io/blog/2023/11/13/3.1.0.html) for more information.

- **init:** Fix `skuba.template.js` validation ([#1325](https://github.com/seek-oss/skuba/pull/1325))

  This resolves an "Invalid function return type" error on `skuba init`.

- **template:** Update to Node 20 ([#1317](https://github.com/seek-oss/skuba/pull/1317))

  Consider upgrading the Node.js version for your project across:
  - `.nvmrc`
  - `package.json#/engines/node`
  - `serverless.yml`
  - `@types/node` package version
  - CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

  If you are updating your AWS Lambda runtime to `nodejs20.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.

## 7.3.0

### Minor Changes

- **Jest.mergePreset:** Propagate root-level configuration options to `projects` ([#1294](https://github.com/seek-oss/skuba/pull/1294))

  [`Jest.mergePreset`](https://seek-oss.github.io/skuba/docs/development-api/jest.html#mergepreset) now propagates the `moduleNameMapper` and `transform` options from root-level configuration to the `projects` array.

  If you were referencing the base config in the `projects` array:

  ```ts
  const baseConfig = Jest.mergePreset({
    // ...
  });

  export default {
    ...baseConfig,
    projects: [
      {
        ...baseConfig,
        displayName: 'unit',
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
      },
      {
        ...baseConfig,
        displayName: 'integration',
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testMatch: ['**/*.int.test.ts'],
      },
    ],
  };
  ```

  You can replace it with the following:

  ```ts
  export default Jest.mergePreset({
    // ...
    projects: [
      {
        displayName: 'unit',
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testPathIgnorePatterns: ['\\.int\\.test\\.ts'],
      },
      {
        displayName: 'integration',
        setupFiles: ['<rootDir>/jest.setup.ts'],
        testMatch: ['**/*.int.test.ts'],
      },
    ],
  });
  ```

  The `projects` option allows you to reuse a single Jest config file for different test types. View the [Jest documentation](https://jestjs.io/docs/configuration#projects-arraystring--projectconfig) for more information.

- **Net.waitFor:** Use Docker Compose V2 ([#1281](https://github.com/seek-oss/skuba/pull/1281))

  This function now executes `docker compose` under the hood as `docker-compose` stopped receiving updates in July 2023. See the [Docker manual](https://docs.docker.com/compose/migrate/) for more information.

- **lint:** Add `prettier-plugin-packagejson` ([#1276](https://github.com/seek-oss/skuba/pull/1276))

  This Prettier plugin sorts and formats your `package.json` file.

### Patch Changes

- **Git:** Handle non-root working directories in [`commitAllChanges`](https://seek-oss.github.io/skuba/docs/development-api/git.html#commitallchanges) ([#1269](https://github.com/seek-oss/skuba/pull/1269))

- **template/koa-rest-api:** Fix `app.test.ts` assertions ([#1282](https://github.com/seek-oss/skuba/pull/1282))

  Previously, [custom `.expect((res) => {})` assertions](https://github.com/ladjs/supertest#expectfunctionres-) were incorrectly defined to return false rather than throw an error. The template has been updated to avoid this syntax, but the most straightforward diff to demonstrate the fix is as follows:

  ```diff
  - await agent.get('/').expect(({ status }) => status !== 404);
  + await agent.get('/').expect(({ status }) => expect(status).not.toBe(404));
  ```

- **template:** seek-oss/docker-ecr-cache 2.1 ([#1266](https://github.com/seek-oss/skuba/pull/1266))

  This update brings a [new `skip-pull-from-cache` option](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin#skipping-image-pull-from-cache) which is useful on `Warm`/`Build Cache` steps.

  At SEEK, our build agents no longer persist their Docker build cache from previous steps. This option allows a preparatory step to proceed on a cache hit without pulling the image from ECR, which can save on average ~1 minute per build for a 2GB Docker image.

- **lint:** Resolve infinite autofix loop ([#1262](https://github.com/seek-oss/skuba/pull/1262))

- **GitHub:** Add working directory parameter to [`readFileChanges`](https://seek-oss.github.io/skuba/docs/development-api/github.html#readfilechanges) ([#1269](https://github.com/seek-oss/skuba/pull/1269))

  The input `ChangedFiles` need to be evaluated against a working directory. While this is technically a breaking change, we have not found any external usage of the function in `SEEK-Jobs`.

  ```diff
  - GitHub.readFileChanges(changedFiles)
  + GitHub.readFileChanges(dir, changedFiles)
  ```

- **lint:** Handle non-root working directories in autofix commits ([#1269](https://github.com/seek-oss/skuba/pull/1269))

  Previously, `skuba lint` could produce surprising autofix commits if it was invoked in a directory other than the Git root. Now, it correctly evaluates its working directory in relation to the Git root, and will only commit file changes within its working directory.

- **cli:** Migrate from Runtypes to Zod ([#1288](https://github.com/seek-oss/skuba/pull/1288))

  The skuba CLI now uses Zod internally. This should not result in noticeable differences for consumers.

- **template:** Mount npm build secret to a separate directory ([#1278](https://github.com/seek-oss/skuba/pull/1278))

  Our templated Buildkite pipelines currently retrieve a temporary `.npmrc`. This file contains an npm read token that allows us to fetch private `@seek`-scoped packages.

  New projects now write this file to `/tmp/` on the Buildkite agent and mount it as a secret to `/root/` in Docker. This separation allows you to commit a non-sensitive `.npmrc` to your GitHub repository while avoiding accidental exposure of the npm read token. This is especially important if you are migrating a project to [pnpm](https://pnpm.io/), which houses some of its configuration options in `.npmrc`.

  Existing projects are generally advised to wait until we've paved a cleaner migration path for pnpm.

## 7.2.0

### Minor Changes

- **deps:** TypeScript 5.2 ([#1247](https://github.com/seek-oss/skuba/pull/1247))

  This major release includes breaking changes. See the [TypeScript 5.2](https://devblogs.microsoft.com/typescript/announcing-typescript-5-2/) announcement for more information.

### Patch Changes

- **deps:** libnpmsearch 7 ([#1255](https://github.com/seek-oss/skuba/pull/1255))

- **deps:** Prettier 3.0.3 ([#1247](https://github.com/seek-oss/skuba/pull/1247))

  See the [release notes](https://github.com/prettier/prettier/blob/main/CHANGELOG.md#303) for more information.

- **deps:** sort-package-json 2.5.1 ([#1257](https://github.com/seek-oss/skuba/pull/1257))

  This should resolve the following TypeScript compiler error:

  ```console
  node_modules/@types/glob/index.d.ts(29,42): error TS2694: Namespace '"node_modules/minimatch/dist/cjs/index"' has no exported member 'IOptions'.
  ```

## 7.1.1

### Patch Changes

- **init:** Resolve directory path when patching Renovate config ([#1241](https://github.com/seek-oss/skuba/pull/1241))

  This should fix the `Failed to patch Renovate config.` warning when creating a new repo.

## 7.1.0

### Minor Changes

- **format, lint:** Skip autofixing on Renovate branches when there is no open pull request ([#1226](https://github.com/seek-oss/skuba/pull/1226))

  This prevents an issue where a Renovate branch can get stuck in the `Edited/Blocked` state without a pull request being raised.

- **deps:** eslint-config-skuba 3 ([#1234](https://github.com/seek-oss/skuba/pull/1234))

  This major upgrade brings in new rules from [typescript-eslint v6](https://typescript-eslint.io/blog/announcing-typescript-eslint-v6/).

  Diff patch from eslint-config-skuba 2 and eslint-config-skuba 3

  ```diff
  {
  +  '@typescript-eslint/array-type': '...',
  +  '@typescript-eslint/ban-tslint-comment': '...',
  +  '@typescript-eslint/class-literal-property-style': '...',
  +  '@typescript-eslint/consistent-generic-constructors': '...',
  +  '@typescript-eslint/consistent-indexed-object-style': '...',
  +  '@typescript-eslint/consistent-type-assertions': '...',
  +  'dot-notation': '...',
  +  '@typescript-eslint/dot-notation': '...',
  +  '@typescript-eslint/no-base-to-string': '...',
  +  '@typescript-eslint/no-confusing-non-null-assertion': '...',
  +  '@typescript-eslint/no-duplicate-enum-values': '...',
  +  '@typescript-eslint/no-duplicate-type-constituents': '...',
  +  '@typescript-eslint/no-redundant-type-constituents': '...',
  +  '@typescript-eslint/no-unsafe-declaration-merging': '...',
  +  '@typescript-eslint/no-unsafe-enum-comparison': '...',
  +  '@typescript-eslint/prefer-for-of': '...',
  +  '@typescript-eslint/prefer-function-type': '...',
  +  '@typescript-eslint/prefer-nullish-coalescing': '...',
  +  '@typescript-eslint/prefer-optional-chain': '...',
  +  '@typescript-eslint/prefer-string-starts-ends-with': '...',
  -  'no-extra-semi': '...',
  -  '@typescript-eslint/no-extra-semi': '...',
  }
  ```

- **format, lint:** Add `pnpm-lock.yaml` to `.prettierignore` ([#1225](https://github.com/seek-oss/skuba/pull/1225))

- **deps:** esbuild 0.19 ([#1236](https://github.com/seek-oss/skuba/pull/1236))

- **format, lint:** Switch distroless image from `nodejs` to `nodejs-debian11` ([#1224](https://github.com/seek-oss/skuba/pull/1224))

  `skuba format` and `skuba lint` will now automatically switch your `gcr.io/distroless/nodejs:18` image to `gcr.io/distroless/nodejs18-debian11`. This is now the [recommended](https://github.com/GoogleContainerTools/distroless/blob/main/nodejs/README.md) base image for Node.js.

### Patch Changes

- **template/\*-rest-api:** Switch distroless image from `nodejs:18` to `nodejs18-debian11` ([#1224](https://github.com/seek-oss/skuba/pull/1224))

## 7.0.1

### Patch Changes

- **test:** Fix Prettier snapshot formatting ([#1220](https://github.com/seek-oss/skuba/pull/1220))

  Jest is not yet compatible with Prettier 3, causing snapshot updates to fail with the following error:

  ```typescript
  TypeError: prettier.resolveConfig.sync is not a function
      at runPrettier (node_modules/jest-snapshot/build/InlineSnapshots.js:308:30)
  ```

  Our [Jest preset](https://seek-oss.github.io/skuba/docs/development-api/jest.html#mergepreset) now implements custom formatting as a workaround until [jestjs/jest#14305](https://github.com/jestjs/jest/issues/14305) is resolved.

  If you do not use our preset, you can temporarily disable formatting in your `jest.config.ts` then manually run `skuba format` after updating snapshots:

  ```diff
  export default {
  + prettierPath: null,
  }
  ```

## 7.0.0

### Major Changes

- **deps:** tsconfig-seek 2 ([#1175](https://github.com/seek-oss/skuba/pull/1175))

  This change sets the [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig#noUncheckedIndexedAccess) compiler option to `true` by default.

  This will flag possible issues with indexed access of arrays and records.

  Before:

  ```ts
  const a: string[] = [];
  const b = a[0];
  //    ^? const b: string
  ```

  After:

  ```ts
  const a: string[] = [];
  const b = a[0];
  //    ^? const b: string | undefined
  ```

  Unfortunately, this change is a double edged sword as your previous code which may look like this may now be invalid.

  ```ts
  if (list.length === 3) {
    const b = list[1];
    //    ^? const b: string | undefined
  }
  ```

  To address this you will need to also explicitly check the index you are accessing.

  ```ts
  if (list.length === 3 && list[1]) {
    const b = list[1];
    //    ^? const b: string
  }
  ```

  This may seem like overkill, however, when you consider that Javascript will also allow this it may make sense

  ```ts
  const a: string[] = [];
  a[1000] = 'foo';
  console.log(a.length); // 1001
  ```

  You can override this setting in your project's `tsconfig.json` by setting it to false.

  ```json
  {
    "compilerOptions": {
      "noUncheckedIndexedAccess": false
    }
  }
  ```

- **deps:** Require Node.js 18.12+ ([#1206](https://github.com/seek-oss/skuba/pull/1206))

  Node.js 16 will reach end of life by September 2023. We have aligned our version support with [sku 12](https://github.com/seek-oss/sku/releases/tag/sku%4012.0.0).

  Consider upgrading the Node.js version for your project across:
  - `.nvmrc`
  - `package.json#/engines/node`
  - `@types/node` package version
  - CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

### Minor Changes

- **deps:** esbuild 0.18 ([#1190](https://github.com/seek-oss/skuba/pull/1190))

  `skuba build` will continue to infer `target` from `tsconfig.json` at this time. See the [esbuild release notes](https://github.com/evanw/esbuild/releases/tag/v0.18.0) for other details.

- **format, lint:** Have Prettier respect `.gitignore` ([#1217](https://github.com/seek-oss/skuba/pull/1217))

  This aligns with the behaviour of the [Prettier 3.0 CLI](https://prettier.io/blog/2023/07/05/3.0.0.html#cli).

- **deps:** TypeScript 5.1 ([#1183](https://github.com/seek-oss/skuba/pull/1183))

  This major release includes breaking changes. See the [TypeScript 5.1](https://devblogs.microsoft.com/typescript/announcing-typescript-5-1/) announcement for more information.

- **deps:** Prettier 3.0 ([#1202](https://github.com/seek-oss/skuba/pull/1202))

  See the [release notes](https://prettier.io/blog/2023/07/05/3.0.0.html) for more information.

### Patch Changes

- **template:** Require Node.js 18.12+ ([#1206](https://github.com/seek-oss/skuba/pull/1206))

- **template/oss-npm-package:** Set `publishConfig.provenance` to `true` ([#1182](https://github.com/seek-oss/skuba/pull/1182))

  See <https://github.blog/2023-04-19-introducing-npm-package-provenance/> for more information.

- **template/lambda-sqs-worker:** Change some info logs to debug ([#1178](https://github.com/seek-oss/skuba/pull/1178))

  The "Function succeeded" log message was changed from `info` to `debug` to reduce the amount of unnecessary logs in production. The message will still be logged in dev environments but at a `debug` level.

- **tsconfig:** Turn off [`noUnusedLocals`](https://www.typescriptlang.org/tsconfig#noUnusedLocals) and [`noUnusedParameters`](https://www.typescriptlang.org/tsconfig#noUnusedParameters) ([#1181](https://github.com/seek-oss/skuba/pull/1181))

  [SEEK's ESLint config](https://github.com/seek-oss/eslint-config-seek) has a [rule](https://eslint.org/docs/latest/rules/no-unused-vars) which works for both function and types. We do not need both tools to do the same thing and ESLint has better support for ignoring files if needed.

- **lint:** Resolve Git root before attempting to autofix ([#1215](https://github.com/seek-oss/skuba/pull/1215))

- **configure:** Resolve Git root before attempting to patch Renovate config ([#1215](https://github.com/seek-oss/skuba/pull/1215))

- **template/lambda-sqs-worker:** Bump aws-sdk-client-mock to 3.0.0 ([#1197](https://github.com/seek-oss/skuba/pull/1197))

  AWS SDK v3.363.0 shipped with breaking type changes.

## 6.2.0

### Minor Changes

- **build, build-package:** Add a skuba config key named `assets` to copy assets to the output directory. ([#1163](https://github.com/seek-oss/skuba/pull/1163))

  In your `package.json`:

  ```diff
   {
     "skuba": {
  +    "assets": [
  +      "**/*.vocab/*translations.json"
  +    ],
       "entryPoint": "src/index.ts",
       "type": "package",
     }
   }
  ```

  This will instruct skuba to copy the files matching the list of globs to the output directory/ies, preserving the directory structure from the source:
  - for `skuba build-package` it will copy them to `lib-commonjs` and `lib-es2015`
  - for `skuba build` it will copy them to `tsconfig.json#/compilerOptions.outDir` (`lib` by default)

### Patch Changes

- **template:** Include manifest files in CODEOWNERS ([#1162](https://github.com/seek-oss/skuba/pull/1162))

  Our templates previously excluded `package.json` and `yarn.lock` from CODEOWNERS. This was intended to support advanced workflows such as auto-merging PRs and augmenting GitHub push notifications with custom tooling. However, we are reverting this configuration as it is more common for SEEKers to prefer a simpler CODEOWNERS-based workflow.

  This will not affect existing projects. If you create a new project and wish to restore the previous behaviour, you can manually extend `.github/CODEOWNERS`:

  ```diff
  * @<%- ownerName %>

  + # Configured by Renovate
  + package.json
  + yarn.lock
  ```

- **deps:** Bump @octokit dependencies ([#1174](https://github.com/seek-oss/skuba/pull/1174))

  This should resolve the following compiler error:

  ```bash
  error TS2339: Property 'annotations' does not exist on type '{}'.
  ```

- **deps:** ts-jest ^29.1.0 ([#1166](https://github.com/seek-oss/skuba/pull/1166))

  This resolves the following `skuba test` warning:

  ```console
  Version 5.0.2 of typescript installed has not been tested with ts-jest. If you're experiencing issues, consider using a supported version (>=4.3.0 <5.0.0-0). Please do not report issues in ts-jest if you are using unsupported versions.
  ```

- **template/\*-rest-api:** Remove Gantry `ignoreAlarms` override ([#1160](https://github.com/seek-oss/skuba/pull/1160))

  This issue has been resolved in Gantry v2.2.0; see its [release notes](https://github.com/SEEK-Jobs/gantry/releases/tag/v2.2.0) for more information.

  ```diff
  deployment:
  - # SEEK-Jobs/gantry#488
  - ignoreAlarms: true
  ```

## 6.1.0

### Minor Changes

- **deps:** eslint-config-skuba 2 ([#1155](https://github.com/seek-oss/skuba/pull/1155))

  This major upgrade removes [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) due to configuration issues experienced on non-React projects.

  Raise a GitHub issue or send us a Slack message if this negatively affects your project.

- **start:** Add `http.Server` support ([#1159](https://github.com/seek-oss/skuba/pull/1159))

  `skuba start` can now be used to create a live-reloading server for `http.Server` instances. See the [`skuba start` documentation](https://seek-oss.github.io/skuba/docs/cli/run.html#skuba-start) for more information.

- **deps:** eslint-config-seek 11 ([#1155](https://github.com/seek-oss/skuba/pull/1155))

  This major upgrade enforces [consistent type imports and exports](https://typescript-eslint.io/blog/consistent-type-imports-and-exports-why-and-how/).

  ```diff
  - import { Context } from 'aws-lambda';
  + import type { Context } from 'aws-lambda';
  ```

  `skuba format` will modify your imports and exports to be consistent with linting rules. These changes are automatically committed if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project.

## 6.0.2

### Patch Changes

- **lint:** Avoid patching Renovate config when it already extends a `SEEK-Jobs` or `seekasia` preset ([#1132](https://github.com/seek-oss/skuba/pull/1132))

## 6.0.1

### Patch Changes

- **lint:** Avoid committing `.npmrc` changes ([#1129](https://github.com/seek-oss/skuba/pull/1129))

  `skuba lint` can automatically commit codegen changes if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project. Previously we made sure to exclude a new `.npmrc` file from the commit, but we now exclude changes to an existing `.npmrc` too.

## 6.0.0

### Major Changes

- **deps:** Require Node.js 16.11+ ([#1124](https://github.com/seek-oss/skuba/pull/1124))

  Node.js 14 will reach end of life by April 2023.

  Consider upgrading the Node.js version for your project across:
  - `.nvmrc`
  - `package.json#/engines/node`
  - CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

### Minor Changes

- **format, lint:** Prepend baseline SEEK `renovate-config` preset ([#1117](https://github.com/seek-oss/skuba/pull/1117))

  `skuba format` and `skuba lint` will now automatically prepend an appropriate baseline preset if your project is configured with a `SEEK-Jobs` or `seekasia` remote:

  ```diff
  // SEEK-Jobs
  {
  - extends: ['seek'],
  + extends: ['local>seek-jobs/renovate-config', 'seek'],
  }

  // seekasia
  {
  - extends: ['seek'],
  + extends: ['local>seekasia/renovate-config', 'seek'],
  }
  ```

  Renovate requires this new configuration to reliably access private SEEK packages. Adding the preset should fix recent issues where Renovate would open then autoclose pull requests, and report ⚠ Dependency Lookup Warnings ⚠.

  See [SEEK-Jobs/renovate-config](https://github.com/SEEK-Jobs/renovate-config) and [seekasia/renovate-config](https://github.com/seekasia/renovate-config) for more information.

- **format, lint, template/\*-rest-api:** Set `keepAliveTimeout` to 31 seconds to prevent HTTP 502s ([#1111](https://github.com/seek-oss/skuba/pull/1111))

  The default Node.js server keep-alive timeout is set to 5 seconds. However, the Gantry default ALB idle timeout is 30 seconds. This would lead to the occasional issues where the sidecar would throw `proxyStatus=502` errors. AWS recommends setting an application timeout larger than the ALB idle timeout.

  `skuba format` and `skuba lint` will now automatically append a keep-alive timeout to a typical `src/listen.ts`:

  ```diff
  // With a listener callback
  const listener = app.listen(config.port, () => {
    const address = listener.address();
  })
  +
  + listener.keepAliveTimeout = 31000;

  // Without a listener callback
  - app.listen(config.port);
  + const listener = app.listen(config.port);
  +
  + listener.keepAliveTimeout = 31000;
  ```

  A more detailed explanation can be found in the below links:
  1. <https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html#connection-idle-timeout>
  2. <https://nodejs.org/docs/latest-v18.x/api/http.html#serverkeepalivetimeout>

- **format, lint:** Bundle `eslint-plugin-yml` ([#1107](https://github.com/seek-oss/skuba/pull/1107))

  [eslint-plugin-yml](https://github.com/ota-meshi/eslint-plugin-yml) is now supported on `skuba format` and `skuba lint`. While the default configuration should be unobtrusive, you can opt in to stricter rules in your `.eslintrc.js`:

  ```diff
  module.exports = {
    extends: ['skuba'],
  + overrides: [
  +   {
  +     files: ['my/strict/config.yaml'],
  +     rules: {
  +       'yml/sort-keys': 'error',
  +     },
  +   },
  + ],
  };
  ```

  YAML files with non-standard syntax may fail ESLint parsing with this change. Gantry resource files should be excluded by default due to their custom templating syntax, and you can list additional exclusions in your `.eslintignore`.

- **start:** Add Fastify support ([#1101](https://github.com/seek-oss/skuba/pull/1101))

  `skuba start` can now be used to create a live-reloading server for Fastify based projects. See the [`skuba start` documentation](https://seek-oss.github.io/skuba/docs/cli/run.html#skuba-start) for more information.

- **format, lint:** Configure ESLint for `{cjs,cts,mjs,mts}` files ([#1126](https://github.com/seek-oss/skuba/pull/1126))

- **lint:** Commit codegen updates ([#1078](https://github.com/seek-oss/skuba/pull/1078))

  `skuba lint` can locally codegen updates to ignore files, module exports and Renovate configuration. These changes are now automatically committed if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project.

- **deps:** TypeScript 5.0 ([#1118](https://github.com/seek-oss/skuba/pull/1118))

  This major release includes breaking changes. See the [TypeScript 5.0](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/) announcement for more information.

### Patch Changes

- **init:** Include baseline SEEK `renovate-config` preset ([#1117](https://github.com/seek-oss/skuba/pull/1117))

- **template/\*-package:** Require Node.js 16.11+ ([#1124](https://github.com/seek-oss/skuba/pull/1124))

- **lint:** Delete `Dockerfile-incunabulum` ([#1078](https://github.com/seek-oss/skuba/pull/1078))

  `skuba lint` may have accidentally committed this internal file to source control in prior versions. It is now automatically removed if you have [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) enabled on your project.

## 5.1.1

### Patch Changes

- **lint:** Exclude internal files from autofix commits ([#1074](https://github.com/seek-oss/skuba/pull/1074))

  `skuba lint` now avoids committing the following internal files in a [GitHub autofix](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes):
  - `.npmrc`
  - `Dockerfile-incunabulum`

## 5.1.0

### Minor Changes

- **deps:** Prettier 2.8 ([#1056](https://github.com/seek-oss/skuba/pull/1056))

  See the [release notes](https://prettier.io/blog/2022/11/23/2.8.0.html) for more information.

- **deps:** TypeScript 4.9 ([#1046](https://github.com/seek-oss/skuba/pull/1046))

  This major release includes breaking changes. See the [TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/) announcement for more information.

### Patch Changes

- **template/lambda-sqs-worker:** Declare `dd-trace` dependency ([#1051](https://github.com/seek-oss/skuba/pull/1051))

  This resolves a `Runtime.ImportModuleError` that occurs if this transitive dependency is not installed:

  ```console
  Runtime.ImportModuleError
  Error: Cannot find module 'dd-trace'
  ```

  Alternatively, you can [configure the Datadog Serverless plugin](https://docs.datadoghq.com/serverless/libraries_integrations/plugin/#configuration-parameters) to bundle these dependencies via [Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html):

  ```diff
  serverless.yml

  custom:
    datadog:
  -   addLayers: false
  +   addLayers: true
  ```

  ```diff
  package.json

  {
    "dependencies": {
  -   "datadog-lambda-js: "x.y.z",
  -   "dd-trace: "x.y.z"
    },
    "devDependencies": {
  +   "datadog-lambda-js: "x.y.z",
  +   "dd-trace: "x.y.z"
    }
  }
  ```

- **template/lambda-sqs-worker\*:** Bump Node.js version to 18 ([#1049](https://github.com/seek-oss/skuba/pull/1049))

  This release contains some breaking changes to the Lambda runtime such as the removal of AWS SDK V2 in favour of AWS SDK V3. See the [AWS Lambda Node.js 18.x runtime announcement](https://aws.amazon.com/blogs/compute/node-js-18-x-runtime-now-available-in-aws-lambda/) for more information.

- **template:** Prompt for target platform (`amd64` or `arm64`) ([#1041](https://github.com/seek-oss/skuba/pull/1041))

- **template/lambda-sqs-worker\*:** Use single hyphen in `renovate-` branch name prefix ([#1050](https://github.com/seek-oss/skuba/pull/1050))

- **deps:** esbuild ~0.16.0 ([#1062](https://github.com/seek-oss/skuba/pull/1062))

- **template/\*-rest-api:** Replace `'{{.Environment}}'` with a custom `environment` Gantry value. ([#1065](https://github.com/seek-oss/skuba/pull/1065))

- **lint:** Require package.json to be sorted ([#1048](https://github.com/seek-oss/skuba/pull/1048))

## 5.0.1

### Patch Changes

- **jest:** Fix `isolatedModules` transform config ([#1036](https://github.com/seek-oss/skuba/pull/1036))

- **deps:** eslint-config-skuba 1.2.0 ([#1035](https://github.com/seek-oss/skuba/pull/1035))

  This introduces an autofix for the TS1205 compiler error.

## 5.0.0

### Major Changes

- **test:** Remove default `src` module alias ([#987](https://github.com/seek-oss/skuba/pull/987))

  Our Jest preset automatically registers your `tsconfig.json` paths as module aliases, but would previously fall back to the `src` alias if the option was omitted or failed to load. This default has now been removed.

  This is not expected to affect most projects. If yours makes use of the `src` alias and its tests are now failing on imports like the following:

  ```typescript
  import { app } from 'src/app.ts';
  ```

  Ensure that you declare this path in a `tsconfig.json` located in your project root:

  ```diff
  {
    "compilerOptions": {
  +   "paths": {
  +     "src": ["src"]
  +   }
    },
    "extends": "skuba/config/tsconfig.json"
  }
  ```

- **build, test:** Default to isolated modules ([#987](https://github.com/seek-oss/skuba/pull/987))

  Our Jest and TypeScript presets now enable [`isolatedModules`](https://www.typescriptlang.org/tsconfig#isolatedModules) by default. Your Jest tests should start quicker, consume less resources, and no longer get stuck on pesky type errors. This should not compromise the type safety of your project as `skuba lint` is intended to type check all production and testing code.

  If your project contains files without imports and exports like `jest.setup.ts`, you can add an empty export statement to them to placate the TypeScript compiler:

  ```console
  jest.setup.ts(1,1): error TS1208: 'jest.setup.ts' cannot be compiled under '--isolatedModules' because it is considered a global script file. Add an import, export, or an empty 'export {}' statement to make it a module.
  ```

  ```diff
  process.env.ENVIRONMENT = 'test';

  + export {};
  ```

  If you previously enabled `isolatedModules` via the `globals` option in your Jest config, this is no longer functional due to syntax changes in ts-jest 29. You should be able to rely on our default going forward. `skuba configure` can attempt to clean up the stale option, or you can remove it from your `jest.config.ts` manually:

  ```diff
  export default Jest.mergePreset({
  - globals: {
  -   'ts-jest': {
  -     // seek-oss/skuba#626
  -     isolatedModules: true,
  -   },
  - },
    // Rest of config
  });
  ```

  Isolated modules are incompatible with certain language features like `const enum`s. We recommend migrating away from such features as they are not supported by the broader ecosystem, including transpilers like Babel and esbuild. If your project is not yet ready for isolated modules, you can override the default in your `tsconfig.json`:

  ```diff
  {
    "compilerOptions": {
  +   "isolatedModules": false
    },
    "extends": "skuba/config/tsconfig.json"
  }
  ```

### Minor Changes

- **format:** Sort package.json ([#1016](https://github.com/seek-oss/skuba/pull/1016))

- **build:** Add experimental esbuild support ([#681](https://github.com/seek-oss/skuba/pull/681))

  You can now build your project with [esbuild](https://esbuild.github.io/). Note that this integration is still experimental, only includes the bare minimum to supplant a basic `tsc`-based build, and is not guaranteed to match `tsc` output. See the [esbuild deep dive](https://seek-oss.github.io/skuba/docs/deep-dives/esbuild.html) for more information.

  To opt in, modify your `package.json`:

  ```diff
  {
    "skuba": {
  +   "build": "esbuild",
      "template": null
    }
  }
  ```

### Patch Changes

- **configure:** Fix `tsconfig.json#/compilerOptions/lib` clobbering ([#1031](https://github.com/seek-oss/skuba/pull/1031))

- **template:** Bump greeter and API templates to Node.js 18 ([#1011](https://github.com/seek-oss/skuba/pull/1011))

  Node.js 18 is now in active LTS. The Lambda templates are stuck on Node.js 16 until the new AWS Lambda runtime is released.

- **template/lambda-sqs-worker-cdk:** Replace Runtypes with Zod as default schema validator ([#984](https://github.com/seek-oss/skuba/pull/984))

- **template/lambda-sqs-worker:** Replace Runtypes with Zod as default schema validator ([#984](https://github.com/seek-oss/skuba/pull/984))

- **configure:** Fix package version lookups ([#974](https://github.com/seek-oss/skuba/pull/974))

  This resolves the following error:

  ```console
  Error: Package "xyz" does not have a valid package.json manifest
  ```

- **configure:** Fix `jest.setup.js` clobbering ([#1031](https://github.com/seek-oss/skuba/pull/1031))

- **template/lambda-sqs-worker\*:** Adjust Buildkite pipelines for new `renovate--` branch name prefix ([#1022](https://github.com/seek-oss/skuba/pull/1022))

  See the [pull request](https://github.com/seek-oss/rynovate/pull/76) that aligns our Renovate presets for more information.

- **template:** Support AMD64 Docker builds via `BUILDPLATFORM` ([#1021](https://github.com/seek-oss/skuba/pull/1021))

  See the [Docker documentation](https://docs.docker.com/build/building/multi-platform/#building-multi-platform-images) for more information. Note that this does not allow you to build on AMD64 hardware then deploy to ARM64 hardware and vice versa. It is provided for convenience if you need to revert to an AMD64 workflow and/or build and run an image on local AMD64 hardware.

- **template/koa-rest-api:** Replace Runtypes with Zod as default schema validator ([#984](https://github.com/seek-oss/skuba/pull/984))

## 4.4.1

### Patch Changes

- **template/lambda-sqs-worker:** Switch to modern Datadog integration ([#965](https://github.com/seek-oss/skuba/pull/965))

  Datadog's CloudWatch integration and the associated [`createCloudWatchClient`](https://github.com/seek-oss/datadog-custom-metrics/pull/177) function from [`seek-datadog-custom-metrics`](https://github.com/seek-oss/datadog-custom-metrics) have been deprecated. We recommend [Datadog's Serverless Framework Plugin](https://docs.datadoghq.com/serverless/libraries_integrations/plugin/) along with their first-party [datadog-lambda-js](https://github.com/DataDog/datadog-lambda-js) and [dd-trace](https://github.com/DataDog/dd-trace-js) npm packages.

- **deps:** Drop `package-json` ([#962](https://github.com/seek-oss/skuba/pull/962))

  This circumvents the [following TypeScript compilation error](https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/62111) on a clean install:

  ```console
  Error: node_modules/@types/cacheable-request/index.d.ts(0,0): error TS2709: Cannot use namespace 'ResponseLike' as a type.
  ```

  If you run into this issue elsewhere in your project, you can temporarily work around it with a [resolution](https://classic.yarnpkg.com/lang/en/docs/selective-version-resolutions/) in your `package.json`:

  ```json
  {
    "resolutions": {
      "@types/responselike": "1.0.0"
    }
  }
  ```

- **template/koa-rest-api:** Drop `uuid` ([#964](https://github.com/seek-oss/skuba/pull/964))

  V4 UUIDs can be generated using the built-in [`crypto.randomUUID()`](https://nodejs.org/docs/latest-v16.x/api/crypto.html#cryptorandomuuidoptions) function starting from Node.js 14.17. This is analogous to the [`Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID) Web API.

  ```diff
  - import { v4 as randomUUID } from 'uuid';
  + import { randomUUID } from 'crypto';
  ```

## 4.4.0

### Minor Changes

- **deps:** Jest 29 ([#953](https://github.com/seek-oss/skuba/pull/953))

  This major release includes breaking changes. See the [announcement post](https://jestjs.io/blog/2022/08/25/jest-29) for more information.

  The `collectCoverageOnlyFrom` configuration option has been removed, and the default snapshot format has been simplified:

  ```diff
  - Expected: \\"a\\"
  + Expected: "a"

  - Object {
  -   Array []
  - }
  + {
  +   []
  + }
  ```

- **deps:** eslint-plugin-jest 27 ([#959](https://github.com/seek-oss/skuba/pull/959))

  This major release includes breaking changes. See the [release note](https://github.com/jest-community/eslint-plugin-jest/releases/tag/v27.0.0) for more information.

  The `jest/no-alias-methods` rule is now [enforced](https://github.com/jest-community/eslint-plugin-jest/pull/1221) and [autofixed](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) to discourage usage of alias methods that will be [removed in Jest 30](https://github.com/facebook/jest/issues/13164).

  ```diff
  - .toBeCalled()
  + .toHaveBeenCalled()
  ```

- **configure, init:** Format `package.json` with [sort-package-json](https://github.com/keithamus/sort-package-json) ([#951](https://github.com/seek-oss/skuba/pull/951))

- **deps:** TypeScript 4.8 ([#954](https://github.com/seek-oss/skuba/pull/954))

  This major release includes breaking changes. See the [TypeScript 4.8](https://devblogs.microsoft.com/typescript/announcing-typescript-4-8/) announcement for more information.

### Patch Changes

- **configure, template:** Ignore linting on `.cdk.staging` directory ([#957](https://github.com/seek-oss/skuba/pull/957))

- **configure, template:** Ignore linting on `cdk.out` directory ([#940](https://github.com/seek-oss/skuba/pull/940))

- **template/\*-npm-package:** Use SSH scheme in repository URL ([#955](https://github.com/seek-oss/skuba/pull/955))

  We have changed the templated format of the `package.json#repository/url` field. This may resolve `skuba release` errors that reference [Git password authentication is shutting down](https://github.blog/changelog/2021-08-12-git-password-authentication-is-shutting-down/) on the GitHub Blog.

  ```diff
  - git+https://github.com/org/repo.git
  + git+ssh://git@github.com/org/repo.git
  ```

- **configure, template:** Allow `.idea` and `.vscode` ignore overrides ([#956](https://github.com/seek-oss/skuba/pull/956))

  You can now append lines like `!.vscode/launch.json` to your ignore files to allow specific editor files to be committed, formatted and/or linted.

## 4.3.1

### Patch Changes

- **deps:** jest-watch-typeahead ^2.0.0 ([#925](https://github.com/seek-oss/skuba/pull/925))

- **template/\*-rest-api:** seek-jobs/gantry v2.0.0 ([#935](https://github.com/seek-oss/skuba/pull/935))

- **template/lambda-sqs-worker:** Remove tty disable from pipeline ([#918](https://github.com/seek-oss/skuba/pull/918))

- **test:** Prefer verbose failure message in execution error annotations ([#910](https://github.com/seek-oss/skuba/pull/910))

- **template/lambda-sqs-worker:** Remove unnecessary IAM permission ([#908](https://github.com/seek-oss/skuba/pull/908))

- **template:** Fix README link to ARM64 guide ([#913](https://github.com/seek-oss/skuba/pull/913))

- **template/\*-rest-api:** Fix Gantry documentation links ([#931](https://github.com/seek-oss/skuba/pull/931))

## 4.3.0

### Minor Changes

- **test:** Add [`jest-watch-typeahead`](https://github.com/jest-community/jest-watch-typeahead) plugin ([#893](https://github.com/seek-oss/skuba/pull/893))

  This enables typeahead suggestions when filtering by file or test name in watch mode.

- **Git:** Add [fastForwardBranch](https://seek-oss.github.io/skuba/docs/development-api/git.html#fastforwardbranch) function ([#882](https://github.com/seek-oss/skuba/pull/882))

- **deps:** TypeScript 4.7 ([#877](https://github.com/seek-oss/skuba/pull/877))

  This major release includes breaking changes. See the [TypeScript 4.7](https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/) announcement for more information.

  While ECMAScript Module support for Node.js is now stable in TypeScript, other aspects of our toolchain have not caught up yet; notably, Node.js still lacks stable APIs for Jest to implement its usual suite of mocking capabilities. We are holding off on recommending existing repositories to make the switch and on providing reference implementations via our templates. As it stands, migrating from CJS to ESM is still an arduous exercise in rewriting import statements and restructuring mocks and test suites at the bare minimum.

- **GitHub:** Add functions to create and upload verified commits using the GitHub GraphQL API ([#882](https://github.com/seek-oss/skuba/pull/882))

  See our [GitHub API documentation](https://seek-oss.github.io/skuba/docs/development-api/github.html) for more information.

- **deps:** Prettier 2.7 ([#899](https://github.com/seek-oss/skuba/pull/899))

  See the [release notes](https://prettier.io/blog/2022/06/14/2.7.0.html) for more information.

### Patch Changes

- **test:** Improve file detection for GitHub annotations ([#885](https://github.com/seek-oss/skuba/pull/885))

- **deps:** package-json ^7.0.0 ([#903](https://github.com/seek-oss/skuba/pull/903))

  Resolves [SNYK-JS-GOT-2932019](https://security.snyk.io/vuln/SNYK-JS-GOT-2932019).

- **template/\*-rest-api:** seek-jobs/gantry v1.8.1 ([#887](https://github.com/seek-oss/skuba/pull/887))

- **template/\*:** Remove `.me` files ([#902](https://github.com/seek-oss/skuba/pull/902))

  SEEK is moving away from Codex to off-the-shelf software powered by Backstage `catalog-info.yaml` files.

  At the moment we're only asking teams to document their systems, which typically span across multiple repositories. We may add `catalog-info.yaml` files back to the templates if there's a need for teams to document their components at a repository level.

- **lint:** Use GitHub GraphQL API to upload verified autofix commits ([#882](https://github.com/seek-oss/skuba/pull/882))

- **template:** Use ARM64 architecture ([#873](https://github.com/seek-oss/skuba/pull/873))

  We now recommend building and running projects on ARM64 hardware for greater cost efficiency. This requires a Graviton-based Buildkite cluster; see our [ARM64 guide](https://seek-oss.github.io/skuba/docs/deep-dives/arm64.html) for more information.

## 4.2.2

### Patch Changes

- **template/lambda-sqs-worker:** Avoid mutation of logger context ([#879](https://github.com/seek-oss/skuba/pull/879))

  We now perform a shallow copy when retrieving the logger context from `AsyncLocalStorage`.

  ```diff
  - mixin: () => loggerContext.getStore() ?? {},
  + mixin: () => ({ ...loggerContext.getStore() }),
  ```

## 4.2.1

### Patch Changes

- **template/private-npm-package:** Use `npm2` build agent queue ([#843](https://github.com/seek-oss/skuba/pull/843))

- **lint, test:** Set timeout for Buildkite and GitHub integrations ([#835](https://github.com/seek-oss/skuba/pull/835))

  Transient network failures can impact annotations and autofixes. We now specify a 30 second timeout for these integration features to prevent them from hanging and indefinitely preoccupying your build agents.

- **template:** Time out Buildkite test steps after 10 minutes ([#842](https://github.com/seek-oss/skuba/pull/842))

  Successful testing and linting should complete within this window. This timeout prevents commands from hanging and indefinitely preoccupying your Buildkite agents.

  ```diff
  steps:
    - label: 🧪 Test & Lint
  +   timeout_in_minutes: 10
  ```

- **cli:** Make warning logs more verbose ([#826](https://github.com/seek-oss/skuba/pull/826))

- **template/lambda-sqs-worker:** Change deployment method to `direct` ([#868](https://github.com/seek-oss/skuba/pull/868))

- **template/koa-rest-api:** Use [AsyncLocalStorage](https://nodejs.org/docs/latest-v16.x/api/async_context.html#asynchronous-context-tracking) to track logger context ([#864](https://github.com/seek-oss/skuba/pull/864))

  We now employ [RequestLogging.createContextStorage](https://github.com/seek-oss/koala/blob/master/src/requestLogging/README.md#context-logging) to thread logging context through the middleware stack of your Koa application. This enables use of a singleton `logger` instance instead of manually propagating Koa context and juggling `rootLogger`s and `contextLogger`s.

  Before:

  ```typescript
  import createLogger from '@seek/logger';
  import Koa, { Context } from 'koa';
  import { RequestLogging } from 'seek-koala';

  const rootLogger = createLogger();

  const contextLogger = (ctx: Context) =>
    rootLogger.child(RequestLogging.contextFields(ctx));

  const app = new Koa().use((ctx) => {
    rootLogger.info('Has no context');

    contextLogger(ctx).info('Has context');
  });
  ```

  After:

  ```typescript
  import createLogger from '@seek/logger';
  import Koa from 'koa';
  import { RequestLogging } from 'seek-koala';

  const { createContextMiddleware, mixin } =
    RequestLogging.createContextStorage();

  const contextMiddleware = createContextMiddleware();

  const logger = createLogger({ mixin });

  const app = new Koa().use(contextMiddleware).use((ctx) => {
    logger.info('Has context');
  });
  ```

- **template/lambda-sqs-worker:** Use [AsyncLocalStorage](https://nodejs.org/docs/latest-v16.x/api/async_context.html#asynchronous-context-tracking) to track logger context ([#871](https://github.com/seek-oss/skuba/pull/871))

  We now employ this Node.js API to thread logging context through the handler of your Lambda function. This enables use of a singleton `logger` instance instead of manually propagating Lambda context and juggling `rootLogger`s and `contextLogger`s, and is equivalent to #864.

  Before:

  ```typescript
  import createLogger from '@seek/logger';
  import { Context } from 'aws-lambda';

  const rootLogger = createLogger();

  const contextLogger = ({ awsRequestId }: Context) =>
    rootLogger.child({ awsRequestId });

  const handler = async (_event: unknown, ctx: Context) => {
    rootLogger.info('Has no context');

    contextLogger(ctx).info('Has context');
  };
  ```

  After:

  ```typescript
  import { AsyncLocalStorage } from 'async_hooks';

  import createLogger from '@seek/logger';
  import { Context } from 'aws-lambda';

  const loggerContext = new AsyncLocalStorage<{ awsRequestId: string }>();

  const logger = createLogger({
    mixin: () => ({ ...loggerContext.getStore() }),
  });

  const handler = (_event: unknown, { awsRequestId }: Context) =>
    loggerContext.run({ awsRequestId }, async () => {
      logger.info('Has context');
    });
  ```

- **template/lambda-sqs-worker\*:** Bump Node.js version to 16 ([#862](https://github.com/seek-oss/skuba/pull/862))

- **build-package, lint:** Improve detection of SEEK Buildkite queues for serial execution ([#829](https://github.com/seek-oss/skuba/pull/829))

- **lint:** Detect and autofix ESLint warnings ([#844](https://github.com/seek-oss/skuba/pull/844))

- **lint:** Skip autofixing when ESLint reports no fixable issues ([#844](https://github.com/seek-oss/skuba/pull/844))

- **format, lint:** Avoid unnecessary template literals ([#849](https://github.com/seek-oss/skuba/pull/849))

  We now automatically convert unnecessary template literals into single-quoted strings for consistency.

- **deps:** Jest 28 ([#856](https://github.com/seek-oss/skuba/pull/856))

  This major release includes breaking changes. See the [announcement post](https://jestjs.io/blog/2022/04/25/jest-28) for more information.

## 4.2.0

### Minor Changes

- **deps:** TypeScript 4.6 ([#811](https://github.com/seek-oss/skuba/pull/811))

  This major release includes breaking changes. See the [TypeScript 4.5](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5/) and [TypeScript 4.6](https://devblogs.microsoft.com/typescript/announcing-typescript-4-6/) announcements for more information.

- **lint:** Autofix in CI ([#800](https://github.com/seek-oss/skuba/pull/800))

  `skuba lint` can now automatically push ESLint and Prettier autofixes. This eases adoption of linting rule changes and automatically resolves issues arising from a forgotten `skuba format`.

  You'll need to configure your CI environment to support this feature. See our [GitHub autofixes](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-autofixes) documentation to learn more.

- **deps:** ESLint 8 + eslint-config-seek 9 ([#806](https://github.com/seek-oss/skuba/pull/806))

  These major upgrades bundle new parser and plugin versions. See the [ESLint 8 guide](https://eslint.org/docs/8.0.0/user-guide/migrating-to-8.0.0) and [eslint-config-seek 9 release](https://github.com/seek-oss/eslint-config-seek/releases/tag/v9.0.0) for more details on the underlying changes.

  We've introduced new linting rules like [@typescript-eslint/no-unsafe-argument](https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-argument.md), and resolved the following installation warning:

  ```console
  babel-eslint is now @babel/eslint-parser. This package will no longer receive updates.
  ```

  If you wish to relax some of the new rules, [extend](https://eslint.org/docs/user-guide/configuring/configuration-files#extending-configuration-files) your `.eslintrc.js` config:

  ```javascript
  module.exports = {
    extends: ['skuba'],
    rules: {
      // Demote new TypeScript ESLint rule from 'error' to 'warn'.
      '@typescript-eslint/no-unsafe-argument': 'warn',
    },
  };
  ```

### Patch Changes

- **template/lambda-sqs-worker-cdk:** Fix progress configuration in `cdk.json` ([#797](https://github.com/seek-oss/skuba/pull/797))

- **Jest.mergePreset:** Allow additional props via type parameter ([#806](https://github.com/seek-oss/skuba/pull/806))

- **Git.currentBranch:** Add helper function ([#804](https://github.com/seek-oss/skuba/pull/804))

- **test:** Strip ANSI escape codes from error messages for GitHub annotations ([#825](https://github.com/seek-oss/skuba/pull/825))

- **Git.commitAllChanges:** Skip commit and return `undefined` when there are no changes ([#804](https://github.com/seek-oss/skuba/pull/804))

- **template/oss-npm-package:** Lock down GitHub workflow permissions ([#807](https://github.com/seek-oss/skuba/pull/807))

  This aligns with [OpenSSF guidance](https://github.com/ossf/scorecard/blob/main/docs/checks.md#token-permissions).

- **template:** Propagate Buildkite environment variables for lint autofixing ([#800](https://github.com/seek-oss/skuba/pull/800))

- **template:** Exclude DOM type definitions by default ([#822](https://github.com/seek-oss/skuba/pull/822))

  TypeScript will now raise compiler errors when DOM globals like `document` and `window` are referenced in new projects. This catches unsafe usage of Web APIs that will throw exceptions in a Node.js context.

  If you are developing a new npm package for browser use or require specific Node.js-compatible Web APIs like the [Encoding API](https://developer.mozilla.org/en-US/docs/Web/API/Encoding_API), you can opt in to DOM type definitions in your `tsconfig.json`:

  ```diff
  {
    "compilerOptions": {
  -   "lib": ["ES2020"]
  +   "lib": ["DOM", "ES2020"]
    }
  }
  ```

  If you have an existing backend project, you can opt out of DOM type definitions in your `tsconfig.json`.

  For Node.js 14:

  ```diff
  {
    "compilerOptions": {
  +   "lib": ["ES2020"],
      "target": "ES2020"
    }
  }
  ```

  For Node.js 16:

  ```diff
  {
    "compilerOptions": {
  +   "lib": ["ES2021"],
      "target": "ES2021"
    }
  }
  ```

- **Git.getOwnerAndRepo:** Support reading from CI environment variables ([#804](https://github.com/seek-oss/skuba/pull/804))

- **Git.getHeadCommitMessage:** Add helper function ([#804](https://github.com/seek-oss/skuba/pull/804))

- **template/\*-rest-api:** Avoid alternative syntax for ENV instructions ([#823](https://github.com/seek-oss/skuba/pull/823))

  Omitting the `=` symbol in ENV instructions [is discouraged and may be disallowed in future](https://docs.docker.com/engine/reference/builder/#env).

  ```diff
  - ENV NODE_ENV production
  + ENV NODE_ENV=production
  ```

- **template/oss-npm-package:** Pin GitHub action versions ([#805](https://github.com/seek-oss/skuba/pull/805))

- **template/\*-rest-api:** seek-jobs/gantry v1.7.0 ([#824](https://github.com/seek-oss/skuba/pull/824))

## 4.1.1

### Patch Changes

- **template:** Disable type checking in tests ([#787](https://github.com/seek-oss/skuba/pull/787))

  Newly initialised projects will skip TypeScript type checking on `skuba test` as it's already covered by `skuba lint`. You can now iterate on your tests without running into annoying compilation errors like TS6133 (unused declarations).

  This will be defaulted for existing projects in a future major version. You can opt in early by setting the `globals` configuration option in your `jest.config.ts`:

  ```typescript
  export default Jest.mergePreset({
    globals: {
      'ts-jest': {
        // seek-oss/skuba#626
        isolatedModules: true,
      },
    },
    // Rest of config
  });
  ```

- **template:** Specify default Buildkite agent ([#775](https://github.com/seek-oss/skuba/pull/775))

- **format, lint:** Suppress `eslint-plugin-react` warning ([#786](https://github.com/seek-oss/skuba/pull/786))

  ```console
  Warning: React version was set to "detect" in eslint-plugin-react settings, but the "react" package is not installed. Assuming latest React version for linting.
  ```

- **deps:** Prettier 2.6 ([#792](https://github.com/seek-oss/skuba/pull/792))

  See the [release notes](https://prettier.io/blog/2022/03/16/2.6.0.html) for more information.

- **node:** Throw unhandled rejections under Node.js 14 ([#777](https://github.com/seek-oss/skuba/pull/777))

  When a rejected promise is left unhandled in Node.js 14, it simply logs a warning. This caused `skuba node` to effectively swallow such failures and report a process exit code of 0. We now override this behaviour with [`--unhandled-rejections=throw`](https://nodejs.org/docs/latest-v16.x/api/cli.html#--unhandled-rejectionsmode) to predictably fail with a non-zero exit code across supported Node.js versions.

- **template/\*-rest-api:** seek-jobs/gantry v1.6.2 ([#778](https://github.com/seek-oss/skuba/pull/778))

## 4.1.0

### Minor Changes

- **node, start:** Load environment variables from `.env` file ([#774](https://github.com/seek-oss/skuba/pull/774))

- **deps:** ts-node ^10.5.0 ([#764](https://github.com/seek-oss/skuba/pull/764))

  This major release includes breaking changes. If your project uses a complex `ts-node` configuration either directly or on top of `skuba node` and `skuba start`, see the [changelog](https://github.com/TypeStrong/ts-node/releases/tag/v10.0.0) for more information.

### Patch Changes

- **template:** skuba-dive ^2.0.0 ([#766](https://github.com/seek-oss/skuba/pull/766))

- **template/lambda-sqs-worker:** Remove `variablesResolutionMode` ([#768](https://github.com/seek-oss/skuba/pull/768))

  This resolves the following deprecation warning in Serverless Framework v3:

  ```console
  Starting with v3.0, the "variablesResolutionMode" option is now useless. You can safely remove it from the configuration
  More info: https://serverless.com/framework/docs/deprecations/#VARIABLES_RESOLUTION_MODE
  ```

- **template/\*-rest-api:** Ignore deployment alarms and ECR scanning ([#773](https://github.com/seek-oss/skuba/pull/773))

- **configure:** Fix `@seek/seek-module-toolkit` migration guide link ([#762](https://github.com/seek-oss/skuba/pull/762))

- **template/lambda-sqs-worker-cdk:** Add `NODE_ENV=production` to environment variables ([#763](https://github.com/seek-oss/skuba/pull/763))

- **template/lambda-sqs-worker:** Add `NODE_ENV=production` to environment variables ([#763](https://github.com/seek-oss/skuba/pull/763))

- **deps:** ts-node-dev ^2.0.0-0 ([#764](https://github.com/seek-oss/skuba/pull/764))

- **template/lambda-sqs-worker:** Move environment variables to `provider.environment` to reduce repetition ([#767](https://github.com/seek-oss/skuba/pull/767))

## 4.0.0

### Major Changes

- **deps:** Require Node.js 14.18+ ([#760](https://github.com/seek-oss/skuba/pull/760))

  Node.js 12 will reach end of life by April 2022. The `semantic-release` package and stable `--enable-source-maps` flag necessitate this new minimum version.

  Consider upgrading the Node.js version for your project across:
  - `.nvmrc`
  - `package.json#/engines/node`
  - CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

- **deps:** semantic-release ^19.0.0 ([#757](https://github.com/seek-oss/skuba/pull/757))

  Resolves [SNYK-JS-MARKED-2342073](https://app.snyk.io/vuln/SNYK-JS-MARKED-2342073) and [SNYK-JS-MARKED-2342082](https://app.snyk.io/vuln/SNYK-JS-MARKED-2342082).

  This may alleviate the following `skuba release` error:

  ```console
  [semantic-release] › ✖  EGHNOPERMISSION The GitHub token doesn't allow to push on the repository owner/repo.
  The user associated with the GitHub token (https://github.com/semantic-release/github/blob/master/README.md#github-authentication) configured in the GH_TOKEN or GITHUB_TOKEN environment variable must allows to push to the repository owner/repo.
  ```

- **template:** Use `--enable-source-maps` ([#761](https://github.com/seek-oss/skuba/pull/761))

  Stable source map support has landed in Node.js 14.18+ via the built-in `--enable-source-maps` option.

  We recommend migrating off of custom source map implementations in favour of this option. Upgrading to [**skuba-dive** v2](https://github.com/seek-oss/skuba-dive/releases/tag/v2.0.0) will remove `source-map-support` from the `skuba-dive/register` hook.

  For a containerised application, update your Dockerfile:

  ```diff
  - FROM gcr.io/distroless/nodejs:12 AS runtime
  + FROM gcr.io/distroless/nodejs:16 AS runtime

  + # https://nodejs.org/api/cli.html#cli_node_options_options
  + ENV NODE_OPTIONS=--enable-source-maps
  ```

  For a Serverless Lambda application, update your `serverless.yml`:

  ```diff
  provider:
  - runtime: nodejs12.x
  + runtime: nodejs14.x

  functions:
    Worker:
      environment:
  +     # https://nodejs.org/api/cli.html#cli_node_options_options
  +     NODE_OPTIONS: --enable-source-maps
  ```

  For a CDK Lambda application, update your stack:

  ```diff
  new aws_lambda.Function(this, 'worker', {
  - runtime: aws_lambda.Runtime.NODEJS_12_X,
  + runtime: aws_lambda.Runtime.NODEJS_14_X,
    environment: {
  +   // https://nodejs.org/api/cli.html#cli_node_options_options
  +   NODE_OPTIONS: '--enable-source-maps',
    },
  });
  ```

### Patch Changes

- **template/lambda-sqs-worker:** Disable `tty` on deploy step ([#753](https://github.com/seek-oss/skuba/pull/753))

  Serverless Framework v3 renders progress spinners on interactive terminals. We recommend disabling [tty](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin#tty-optional-run-only) in CI/CD for cleaner log output.

- **template/lambda-sqs-worker:** serverless ^3.0.0 ([#748](https://github.com/seek-oss/skuba/pull/748))

- **template/lambda-sqs-worker:** Replace `custom.env` configuration with `params` ([#752](https://github.com/seek-oss/skuba/pull/752))

  You can now define environment specific variables using the new Serverless parameters feature. See <https://www.serverless.com/framework/docs/guides/parameters> for more details.

- **template/\*-rest-api:** seek-jobs/gantry v1.6.1 ([#759](https://github.com/seek-oss/skuba/pull/759))

- **template/lambda-sqs-worker:** Remove `provider.lambdaHashingVersion` ([#751](https://github.com/seek-oss/skuba/pull/751))

  This resolves the following deprecation warning in Serverless Framework v3:

  ```console
  Setting "20201221" for "provider.lambdaHashingVersion" is no longer effective as new hashing algorithm is now used by default. You can safely remove this property from your configuration.
  ```

- **deps:** eslint-config-skuba 1.0.14 ([#758](https://github.com/seek-oss/skuba/pull/758))

  This disables the `tsdoc/syntax` ESLint rule in tests for compatibility with `/** @jest-environment env */` directives.

- **deps:** isomorphic-git ^1.11.1 ([#750](https://github.com/seek-oss/skuba/pull/750))

  Resolves [SNYK-JS-SIMPLEGET-2361683](https://security.snyk.io/vuln/SNYK-JS-SIMPLEGET-2361683).

## 3.17.2

### Patch Changes

- **init:** Fix GitHub template cloning ([#739](https://github.com/seek-oss/skuba/pull/739))

  This resolves the following error when cloning a project template from GitHub:

  ```typescript
  UnknownTransportError: Git remote "git@github.com:owner/repo.git" uses an unrecognized transport protocol: "ssh"
  ```

- **template/lambda-sqs-worker:** Remove qualifier from smoke test invocation ([#743](https://github.com/seek-oss/skuba/pull/743))

  Previously, this template's smoke test hook specified a `$LATEST` qualifier in its `Lambda.Invoke` API call. AWS authorised the call based on the unqualified Lambda ARN in our `serverless.yml` IAM policy, but will stop doing so after April 2022.

  To avoid deployment failures, remove the qualifier in `src/hooks.ts`. An unqualified call is equivalent to targeting `$LATEST`.

  ```diff
  - Qualifier: '$LATEST',
  + Qualifier: undefined,
  ```

- **node:** Register `tsconfig-paths` in REPL ([#745](https://github.com/seek-oss/skuba/pull/745))

  This resolves the following error:

  ```typescript
  Error: Cannot find module '/node_modules/skuba/lib/register'
  Require stack:
  - internal/preload
  ```

## 3.17.1

### Patch Changes

- **deps:** ts-jest ^27.1.2 ([#729](https://github.com/seek-oss/skuba/pull/729))

  This resolves the following import issue in older 27.0.x versions of `ts-jest`:

  ```console
  TypeError: pathsToModuleNameMapper is not a function
  ```

- **test:** Restore Node.js 12 compatibility ([#730](https://github.com/seek-oss/skuba/pull/730))

  This resolves the following error in Node.js 12 environments:

  ```typescript
  Object.entries(parsedConfig.options.paths ?? DEFAULT_PATHS).flatMap(
                                             ^

  SyntaxError: Unexpected token '?'
  ```

  Note that Node.js 12 will reach its end of life in May 2022.

## 3.17.0

### Minor Changes

- **template/koa-rest-api:** Add opt-in OpenTelemetry support ([#706](https://github.com/seek-oss/skuba/pull/706))

- **deps:** Prettier 2.5 ([#701](https://github.com/seek-oss/skuba/pull/701))

  See the [release notes](https://prettier.io/blog/2021/11/25/2.5.0.html) for more information.

- **node, start:** Register `tsconfig-paths` ([#678](https://github.com/seek-oss/skuba/pull/678))

  You can now define module aliases other than `src` for local development and scripting. Specify these through the `paths` compiler option in your `tsconfig.json`:

  ```jsonc
  // tsconfig.json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "src": ["src"],
      },
    },
  }
  ```

- **GitHub.buildNameFromEnvironment:** Export helper function ([#676](https://github.com/seek-oss/skuba/pull/676))

- **jest:** Support `tsconfig.json` paths ([#698](https://github.com/seek-oss/skuba/pull/698))

  Module aliases other than `src` are now supported in `skuba test`. Our Jest preset includes a dynamic `moduleNameMapper` that reads the `paths` compiler option from your `tsconfig.json`.

- **git:** Export helper functions ([#689](https://github.com/seek-oss/skuba/pull/689))

- **test:** Add GitHub check run annotations ([#648](https://github.com/seek-oss/skuba/pull/648))

  `skuba test` can now automatically annotate GitHub commits when you [propagate CI environment variables and a GitHub API token](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-annotations). These annotations also appear inline with code under the “Files changed” tab in pull requests.

- **GitHub.getPullRequestNumber:** Export helper function ([#690](https://github.com/seek-oss/skuba/pull/690))

- **GitHub.putIssueComment:** Export helper function ([#690](https://github.com/seek-oss/skuba/pull/690))

  This enables use cases like a persistent bot comment at the top of a pull request a la Changesets that reflects the current status of a CI check.

- **GitHub.enabledFromEnvironment:** Export helper function ([#676](https://github.com/seek-oss/skuba/pull/676))

### Patch Changes

- **GitHub.createCheckRun:** Support `text` parameter ([#673](https://github.com/seek-oss/skuba/pull/673))

- **template:** Retrieve GitHub token on Test & Lint ([#667](https://github.com/seek-oss/skuba/pull/667))

- **template:** serverless-prune-plugin ^2.0.0 ([#719](https://github.com/seek-oss/skuba/pull/719))

- **test:** Fix `ts-jest` imports ([#715](https://github.com/seek-oss/skuba/pull/715))

  This resolves the following warning:

  ```console
  Replace any occurrences of "ts-jest/utils" with just "ts-jest".
  ```

  If you're using the `mocked` utility from `ts-jest`, switch over to the built-in Jest function:

  ```diff
  import git from 'isomorphic-git';
  - import { mocked } from 'ts-jest';

  jest.mock('isomorphic-git');

  - mocked(git.commit).mockResolvedValue('');
  + jest.mocked(git.commit).mockResolvedValue('');
  ```

- **template/lambda-sqs-worker-cdk:** Migrate to AWS CDK v2 ([#714](https://github.com/seek-oss/skuba/pull/714))

- **node, start:** Deregister `source-map-support` ([#679](https://github.com/seek-oss/skuba/pull/679))

  `ts-node` takes care of this for us.

- **template/lambda-sqs-worker-cdk:** Fix docker-compose volume mount and deploy output ([#695](https://github.com/seek-oss/skuba/pull/695))

- **Jest.mergePreset:** Allow `displayName` and `projects` ([#648](https://github.com/seek-oss/skuba/pull/648))

## 3.16.2

### Patch Changes

- **format, lint:** Skip reading unsupported Prettier files into memory ([#662](https://github.com/seek-oss/skuba/pull/662))

- **format, lint:** Fix file descriptor warnings ([#664](https://github.com/seek-oss/skuba/pull/664))

  This resolves the following warning when processing files that Prettier cannot parse:

  ```console
  (node:123) Warning: File descriptor 456 closed but not opened in unmanaged mode
  ```

## 3.16.1

### Patch Changes

- **deps:** Include `@octokit/types` ([#660](https://github.com/seek-oss/skuba/pull/660))

  This should fix the following compilation error:

  ```
  node_modules/skuba/lib/api/github/checkRun.d.ts(2,45): error TS2339: Property 'POST /repos/{owner}/{repo}/check-runs' does not exist on type 'Endpoints'.
  ```

## 3.16.0

### Minor Changes

- **GitHub.createCheckRun:** Add development API for writing annotations ([#625](https://github.com/seek-oss/skuba/pull/625))

- **lint:** Add GitHub check run annotations ([#625](https://github.com/seek-oss/skuba/pull/625))

  `skuba lint` can now automatically annotate GitHub commits when you [propagate Buildkite environment variables and a GitHub API token](https://seek-oss.github.io/skuba/docs/deep-dives/github.html#github-annotations). These annotations also appear inline with code under the “Files changed” tab in pull requests.

- **format, lint:** Enable ESLint caching ([#645](https://github.com/seek-oss/skuba/pull/645))

  ESLint now writes to a local `.eslintcache` store. This speeds up subsequent runs of `skuba format` and `skuba lint` as they can skip unchanged files.

- **deps:** eslint-config-skuba 1.0.12 ([#623](https://github.com/seek-oss/skuba/pull/623))

  This adds a couple new linting rules:
  - [jest/prefer-expect-resolves](https://github.com/jest-community/eslint-plugin-jest/blob/v25.2.2/docs/rules/prefer-expect-resolves.md)
  - [jest/prefer-to-be](https://github.com/jest-community/eslint-plugin-jest/blob/v25.2.2/docs/rules/prefer-to-be.md)

  Run `skuba format` to automatically align your code with these rules.

- **format, lint:** Synchronise ignore files ([#646](https://github.com/seek-oss/skuba/pull/646))

  `skuba format` and `skuba lint` will now keep `.eslintignore`, `.gitignore` and `.prettierignore` in sync. This automatically applies new exclusions like `.eslintcache` without the need for a manual `skuba configure`.

### Patch Changes

- **template:** Use correct `environment` key in `docker-compose.yml` ([#654](https://github.com/seek-oss/skuba/pull/654))

- **template/lambda-sqs-worker:** Switch to ARM64 architecture ([#640](https://github.com/seek-oss/skuba/pull/640))

  These are a bit cheaper and a bit faster than x86 Lambdas:
  <https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2-processor-run-your-functions-on-arm-and-get-up-to-34-better-price-performance/>

  The underlying Lambda architecture should be invisible to typical TypeScript Lambdas.

- **template:** Bump non-Lambda templates to Node.js 16 ([#633](https://github.com/seek-oss/skuba/pull/633))

  Node.js 16 is now in active LTS. The Lambda templates are stuck on Node.js 14 until the new AWS Lambda runtime is released.

- **template:** seek-jobs/gantry v1.5.2 ([#634](https://github.com/seek-oss/skuba/pull/634))

- **deps:** typescript 4.4.4 ([#616](https://github.com/seek-oss/skuba/pull/616))

- **start:** Add a `?` placeholder for unnamed function arguments ([#647](https://github.com/seek-oss/skuba/pull/647))

- **deps:** Relax ranges ([#622](https://github.com/seek-oss/skuba/pull/622))

  Projects can now upgrade to new Prettier and TypeScript patches and `ts-node-dev` minors without us having to cut a new release.

- **template:** hot-shots ^9.0.0 ([#639](https://github.com/seek-oss/skuba/pull/639))

- **template/lambda-sqs-worker:** Remove `pino.Logger` indirection ([#624](https://github.com/seek-oss/skuba/pull/624))

- **template:** @seek/logger ^5.0.0 ([#621](https://github.com/seek-oss/skuba/pull/621))

- **template:** Ignore `.gantry` YAML paths via `.prettierignore` ([#636](https://github.com/seek-oss/skuba/pull/636))

  Gantry resource and value files often live in the `.gantry` subdirectory and may use non-standard template syntax.

- **template:** Propagate environment variables for GitHub annotations ([#642](https://github.com/seek-oss/skuba/pull/642))

  This enables GitHub annotations for newly-initialised projects with the appropriate Buildkite configuration.

## 3.15.2

### Patch Changes

- **Jest.mergePreset:** Do not mutate underlying defaults ([#595](https://github.com/seek-oss/skuba/pull/595))

  `Jest.mergePreset` no longer mutates the internal `jest-preset` object. Subsequent calls to `Jest.mergePreset` will no longer return results merged in from previous calls.

  **Warning:** If you rely on mutating the core `jest-preset` object for later access, this is a _Breaking Change_.

- **template/lambda-sqs-worker:** Convert Serverless `isProduction` config value to boolean ([#602](https://github.com/seek-oss/skuba/pull/602))

  This avoids potentially surprising behaviour if you try to make use of this config value in a context that tests for truthiness. The boolean is still correctly applied as a string `seek:env:production` tag value.

- **node, start:** Handle void function inputs and outputs ([#597](https://github.com/seek-oss/skuba/pull/597))

  When running a function entrypoint, `skuba node` and `skuba start` now handle an omitted request body the same as an empty JSON array of arguments `[]`. The function can also return `undefined` to omit a response body.

- **template/lambda-sqs-worker:** Opt in to [new Serverless variables resolver](https://www.serverless.com/framework/docs/deprecations/#NEW_VARIABLES_RESOLVER) ([#601](https://github.com/seek-oss/skuba/pull/601))

- **lint:** Use worker threads when running `--serial`ly ([#607](https://github.com/seek-oss/skuba/pull/607))

  This aims to reduce the memory footprint of `skuba lint --serial`. ESLint and Prettier are now run in worker threads so their memory can be more readily freed on thread exit.

- **template:** Remove README tables of contents ([#596](https://github.com/seek-oss/skuba/pull/596))

  GitHub's Markdown renderer now generates its own table of contents.

- **configure, init:** Drop dependency on external Git installation ([#599](https://github.com/seek-oss/skuba/pull/599))

  We now interface with `isomorphic-git` internally, which ensures compatibility and affords finer control over log output.

- **format, lint:** Run Prettier serially on files ([#606](https://github.com/seek-oss/skuba/pull/606))

  This aims to reduce the memory footprint of `skuba lint`.

- **template:** seek-jobs/gantry v1.5.1 ([#604](https://github.com/seek-oss/skuba/pull/604))

- **Jest.mergePreset:** Allow configuration of test environment ([#592](https://github.com/seek-oss/skuba/pull/592))

  [Jest's `testEnvironment`](https://jestjs.io/docs/configuration#testenvironment-string) can now be passed to `Jest.mergePreset`:

  ```ts
  export default Jest.mergePreset({
    testEnvironment: 'jsdom',
  });
  ```

- **template/lambda-sqs-worker:** Fail fast on invalid Serverless config ([#605](https://github.com/seek-oss/skuba/pull/605))

- **template:** pino-pretty ^6.0.0 ([#594](https://github.com/seek-oss/skuba/pull/594))

  pino-pretty@7 requires pino@7, which has not been released on its stable channel yet.

- **node, start:** Print function entrypoint parameters ([#600](https://github.com/seek-oss/skuba/pull/600))

  When running a function entrypoint, `skuba node` and `skuba start` now print the function and parameter names as a usage hint:

  ```javascript
  yarn skuba node 'src/api/buildkite/annotate.ts#annotate'
  // annotate (markdown, opts)
  // listening on port 9001

  curl --data '["_Hello there_", {}]' --include localhost:9001
  ```

## 3.15.1

### Patch Changes

- **configure:** Tone down Dockerfile `outDir` processing ([#585](https://github.com/seek-oss/skuba/pull/585))

  This avoids rewriting sequences like "distroless" as "libroless".

- **template:** Remove `unknown` specifier in catch clauses ([#580](https://github.com/seek-oss/skuba/pull/580))

  Strict TypeScript 4.4 now defaults to typing catch clause variables as `unknown`.

- **build-package, lint:** Handle worker thread errors more gracefully ([#583](https://github.com/seek-oss/skuba/pull/583))

  The worker threads now correctly propagate an exit code and log errors instead of triggering an `UnhandledPromiseRejectionWarning`.

- **format, lint:** Limit Prettier to 25 parallel file I/O operations ([#584](https://github.com/seek-oss/skuba/pull/584))

  This should alleviate file descriptor issues that are not handled by `graceful-fs` such as `EBADF: bad file description, close`.

## 3.15.0

### Minor Changes

- **lint:** Run ESLint and Prettier in worker threads ([#548](https://github.com/seek-oss/skuba/pull/548))

  This reduces the number of Node.js processes spawned by `skuba lint`. We've also been able to significantly enhance our logging output as a result, particularly when the `--debug` flag is supplied.

- **build-package, lint:** Add `--serial` flag ([#556](https://github.com/seek-oss/skuba/pull/556))

  This explicitly disables concurrent command execution.

  Propagating the `BUILDKITE` environment variable to these commands no longer constrains their concurrency. If you were relying on this behaviour to reduce resource contention on undersized Buildkite agents, update your commands to pass in the flag:

  ```diff
  - build-package
  + build-package --serial

  - lint
  + lint --serial
  ```

  See our [Buildkite guide](https://seek-oss.github.io/skuba/docs/deep-dives/buildkite.html) for more information.

- **node:** Run REPL in process ([#534](https://github.com/seek-oss/skuba/pull/534))

  This avoids creating a separate Node.js process just to run the REPL.

- **Buildkite.annotate:** Add development API for writing annotations ([#558](https://github.com/seek-oss/skuba/pull/558))

- **format:** Execute ESLint with `--report-unused-disable-directives` ([#512](https://github.com/seek-oss/skuba/pull/512))

  `skuba format` will now flag unused disable directives, and will [automatically remove](https://eslint.org/blog/2021/06/whats-coming-in-eslint-8.0.0#unused-disable-directives-are-now-fixable) them once ESLint v8 is released.

- **deps:** Prettier 2.4 ([#507](https://github.com/seek-oss/skuba/pull/507))

  This includes TypeScript 4.4 support. See the [release notes](https://prettier.io/blog/2021/09/09/2.4.0.html) for more information.

- **deps:** TypeScript 4.4 ([#497](https://github.com/seek-oss/skuba/pull/497))

  This major release includes breaking changes. See the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-4/) for more information.

  Note that new syntax in TypeScript 4.4 will only be supported by `skuba format` and `skuba lint` once ESLint v8 is released.

- **format:** Run ESLint and Prettier in process ([#539](https://github.com/seek-oss/skuba/pull/539))

  This eliminates the overhead of spinning up separate Node.js processes. We've also been able to significantly enhance our logging output as a result, particularly when the `--debug` flag is supplied.

- **build:** Remove experimental Babel support ([#513](https://github.com/seek-oss/skuba/pull/513))

  There's limited upside to switching to [Babel-based builds](https://seek-oss.github.io/skuba/docs/deep-dives/babel.html) for backend use cases, and it would be difficult to guarantee backwards compatibility with existing `tsconfig.json`-based configuration. Dropping Babel dependencies reduces our package size and resolves [SNYK-JS-SETVALUE-1540541](https://app.snyk.io/vuln/SNYK-JS-SETVALUE-1540541).

- **lint:** Support Buildkite annotations ([#558](https://github.com/seek-oss/skuba/pull/558))

  `skuba lint` can now output issues as Buildkite annotations.

  See our [Buildkite guide](https://seek-oss.github.io/skuba/docs/deep-dives/buildkite.html) for more information.

### Patch Changes

- **template:** pino-pretty ^7.0.0 ([#506](https://github.com/seek-oss/skuba/pull/506))

- **template:** Configure environment variables and volume mounts for Buildkite annotations ([#558](https://github.com/seek-oss/skuba/pull/558))

- **template:** serverless-plugin-canary-deployments ^0.7.0 ([#508](https://github.com/seek-oss/skuba/pull/508))

- **template/lambda-sqs-worker\*:** Prime dev ECR cache in Buildkite pipeline ([#503](https://github.com/seek-oss/skuba/pull/503))

  This should result in faster "Deploy Dev" times as the ECR cache will already be warm.

- **template:** seek-jobs/gantry v1.4.1 ([#504](https://github.com/seek-oss/skuba/pull/504))

- **template:** Remove `@types/node` resolution override ([#498](https://github.com/seek-oss/skuba/pull/498))

  Jest 27.1 is compatible with newer versions of `@types/node`.

- **template/\*-rest-api:** Suggest using a secure header middleware ([#579](https://github.com/seek-oss/skuba/pull/579))

- **template/lambda-sqs-worker-cdk:** Run "Test, Lint & Build" step in prod ([#503](https://github.com/seek-oss/skuba/pull/503))

  This reduces our dependence on a dev environment to successfully deploy to prod.

- **build-package, lint:** Simplify logging prefix ([#535](https://github.com/seek-oss/skuba/pull/535))

- **Jest.mergePreset:** Allow `watchPathIgnorePatterns` ([#555](https://github.com/seek-oss/skuba/pull/555))

- **build-package, lint:** Limit max concurrency to CPU core count ([#540](https://github.com/seek-oss/skuba/pull/540))

- **template:** Remove Yarn cache from worker Docker images ([#499](https://github.com/seek-oss/skuba/pull/499))

  This shrinks the cached Docker images that our worker templates generate.

## 3.14.4

### Patch Changes

- **template:** @types/node ^14.17.19 ([#490](https://github.com/seek-oss/skuba/pull/490))
- **template:** seek-jobs/gantry v1.4.0 ([#483](https://github.com/seek-oss/skuba/pull/483))
- **deps:** @types/jest ^27.0.0 ([#489](https://github.com/seek-oss/skuba/pull/489))
- **template/\*-rest-api:** Parameterise AWS region ([#488](https://github.com/seek-oss/skuba/pull/488))

## 3.14.3

### Patch Changes

- **template:** seek-oss/docker-ecr-cache v1.11.0 ([#467](https://github.com/seek-oss/skuba/pull/467))
- **template:** Add `test:ci` script ([#473](https://github.com/seek-oss/skuba/pull/473))
- **template:** Force `@jest/types` resolution to fix clean installs ([#468](https://github.com/seek-oss/skuba/pull/468))
- **template/lambda-sqs-worker:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#476](https://github.com/seek-oss/skuba/pull/476))
- **template/greeter:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#476](https://github.com/seek-oss/skuba/pull/476))
- **template/lambda-sqs-worker-cdk:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#476](https://github.com/seek-oss/skuba/pull/476))
- **template:** Group Buildkite pipeline anchors ([#474](https://github.com/seek-oss/skuba/pull/474))

  This provides a bit more structure to our `pipeline.yml`s and allows anchored plugins to be recognised by Renovate.

- **deps:** ts-node-dev 1.1.8 ([#462](https://github.com/seek-oss/skuba/pull/462))
- **template/express-rest-api:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#471](https://github.com/seek-oss/skuba/pull/471))
- **template/\*-rest-api:** Reduce app boilerplate ([#478](https://github.com/seek-oss/skuba/pull/478))
- **template:** Default Docker Compose image to empty string ([#469](https://github.com/seek-oss/skuba/pull/469))

  This suppresses Docker Compose CLI warnings and errors when running outside of Buildkite.

- **template:** Use BUILDKITE_PIPELINE_DEFAULT_BRANCH in `pipeline.yml` ([#475](https://github.com/seek-oss/skuba/pull/475))
- **configure, init:** Deduplicate dependencies ([#470](https://github.com/seek-oss/skuba/pull/470))
- **template:** Add placeholder test coverage configuration ([#472](https://github.com/seek-oss/skuba/pull/472))
- **template/lambda-sqs-worker-\*:** Build once upfront ([#477](https://github.com/seek-oss/skuba/pull/477))

  This employs Buildkite [artifacts](https://buildkite.com/docs/pipelines/artifacts) to share compiled code with each subsequent deployment step.

- **deps:** TypeScript 4.3.5 ([#463](https://github.com/seek-oss/skuba/pull/463))
- **template/koa-rest-api:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#471](https://github.com/seek-oss/skuba/pull/471))

## 3.14.2

### Patch Changes

- **deps:** TypeScript 4.3.4 ([#455](https://github.com/seek-oss/skuba/pull/455))
- **deps:** prettier 2.3.2 ([#460](https://github.com/seek-oss/skuba/pull/460))
- **template/koa-rest-api:** Include success message in smoke test body ([#459](https://github.com/seek-oss/skuba/pull/459))
- **template/greeter:** Use `seek-oss/docker-ecr-cache` Buildkite plugin ([#453](https://github.com/seek-oss/skuba/pull/453))
- **template/lambda-sqs-worker:** Set `memorySize` for smoke test hook to 128 MiB ([#457](https://github.com/seek-oss/skuba/pull/457))
- **template/koa-rest-api:** Use `seek-oss/docker-ecr-cache` Buildkite plugin ([#453](https://github.com/seek-oss/skuba/pull/453))
- **template/express-rest-api:** Use `seek-oss/docker-ecr-cache` Buildkite plugin ([#453](https://github.com/seek-oss/skuba/pull/453))
- **template:** Reuse ECR cache in Docker Compose ([#453](https://github.com/seek-oss/skuba/pull/453))
- **deps:** ts-node-dev 1.1.7 ([#461](https://github.com/seek-oss/skuba/pull/461))

  Resolves [CVE-2021-33623](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-33623).

## 3.14.1

### Patch Changes

- **deps:** Prettier 2.3.1 ([#446](https://github.com/seek-oss/skuba/pull/446))

  `skuba format` and `skuba lint` now support TypeScript 4.3 syntax. See the full Prettier [changelog](https://github.com/prettier/prettier/blob/4b4499a0d86220f4c393dc93140e2bac7992d0f4/CHANGELOG.md#%E2%80%8B231) for more information.

- **template:** pino-pretty ^5.0.0 ([#441](https://github.com/seek-oss/skuba/pull/441))
- **template:** seek-jobs/gantry v1.3.0 ([#452](https://github.com/seek-oss/skuba/pull/452))

## 3.14.0

### Minor Changes

- **deps:** Prettier 2.3 ([#434](https://github.com/seek-oss/skuba/pull/434))

  This release may require reformatting of your code. If your lint step is failing in CI, run your format command locally then push the resulting changes.

  ```shell
  yarn format
  ```

- **deps:** TypeScript 4.3 ([#434](https://github.com/seek-oss/skuba/pull/434))

  This major release includes breaking changes. See the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-3/) for more information.

  `skuba format` and `skuba lint` will error on new TypeScript 4.3 syntax that are not yet supported by Prettier.

- **deps:** Jest 27 ([#433](https://github.com/seek-oss/skuba/pull/433))

  This major release includes breaking changes. See the Jest 27 [blog post](https://jestjs.io/blog/2021/05/25/jest-27) and [changelog](https://github.com/facebook/jest/blob/v27.0.3/CHANGELOG.md) for more information.

### Patch Changes

- **Jest.mergePreset:** Type `snapshotSerializers` option ([#436](https://github.com/seek-oss/skuba/pull/436))
- **template:** Banish `typeof undefined` syntax ([#429](https://github.com/seek-oss/skuba/pull/429))
- **template/lambda-sqs-worker-cdk:** Always build before deploy ([#428](https://github.com/seek-oss/skuba/pull/428))

  This prevents stale compiled code from being cached and deployed from ECR.

- **template/koa-rest-api:** Log returned error responses ([#430](https://github.com/seek-oss/skuba/pull/430))
- **template:** Prune `devDependencies` instead of installing twice in Docker ([#435](https://github.com/seek-oss/skuba/pull/435))

  The template-bundled Dockerfiles would previously run `yarn install` twice to build a separate stage for production `dependencies` only. These have been updated to correctly share the Yarn cache across stages and to use `yarn install --production` to perform offline pruning.

- **deps:** fs-extra ^10.0.0 ([#424](https://github.com/seek-oss/skuba/pull/424))

## 3.13.1

### Patch Changes

- **template/\*-npm-package:** Add `yarn commit` script ([#418](https://github.com/seek-oss/skuba/pull/418))
- **template/lambda-sqs-worker-cdk:** Trim CDK deployment output ([#423](https://github.com/seek-oss/skuba/pull/423))
- **template:** @types/node ^15.0.0 ([#422](https://github.com/seek-oss/skuba/pull/422))
- **deps:** typescript 4.2.4 ([#376](https://github.com/seek-oss/skuba/pull/376))

  See the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-2/) for features and breaking changes. Note that the currently bundled version of Prettier does not support `abstract` construct signatures.

- **template/lambda-sqs-worker-cdk:** Fix npm token in Buildkite pipeline ([#423](https://github.com/seek-oss/skuba/pull/423))

## 3.13.0

### Minor Changes

- **template/lambda-sqs-worker-cdk:** Add new template ([#395](https://github.com/seek-oss/skuba/pull/395))
- **format, lint:** Support `--debug` flag ([#367](https://github.com/seek-oss/skuba/pull/367))
- **template:** Upgrade to Node 14 ([#347](https://github.com/seek-oss/skuba/pull/347))

  Node.js 14 is [now supported on AWS Lambda](https://aws.amazon.com/about-aws/whats-new/2021/02/aws-lambda-now-supports-node-js-14/). This lets us upgrade the Node.js requirement for skuba's templates.

  This should only impact newly created projects. You can use the template changes in this PR as an example of how to upgrade an existing project. A future version of skuba may include a fixup command to automatically upgrade your project to the most recent LTS release.

### Patch Changes

- **template/lambda-sqs-worker:** Use new `serverless.yml#/provider/iam` grouping ([#357](https://github.com/seek-oss/skuba/pull/357))

  The `provider.iamRoleStatements` property [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.25.1/docs/deprecations.md#grouping-iam-settings-under-provideriam).

- **template/lambda-sqs-worker:** serverless-plugin-canary-deployments ^0.5.0 ([#394](https://github.com/seek-oss/skuba/pull/394))

  The plugin now patches in CodeDeploy permissions to your `iamRoleStatements`, so you can clean your `serverless.yml`:

  ```diff
  - - Action: codedeploy:PutLifecycleEventHookExecutionStatus
  -   Effect: Allow
  -   Resource: !Sub arn:aws:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:*/${WorkerLambdaFunctionDeploymentGroup}
  ```

- **template:** runtypes-filter ^0.6.0 ([#408](https://github.com/seek-oss/skuba/pull/408))
- **template/koa-rest-api:** Fix ineffectual smoke test ([#361](https://github.com/seek-oss/skuba/pull/361))
- **template:** Drop region parameterisation ([#363](https://github.com/seek-oss/skuba/pull/363))
- **deps:** semantic-release ^17.3.8 ([#353](https://github.com/seek-oss/skuba/pull/353))

  Resolves [SNYK-JS-MARKED-1070800](https://app.snyk.io/vuln/SNYK-JS-MARKED-1070800).

- **template/\*-rest-api:** Fail Gantry build if ECR scanning reports vulnerabilities ([#373](https://github.com/seek-oss/skuba/pull/373))
- **template:** runtypes ^6.0.0 ([#404](https://github.com/seek-oss/skuba/pull/404))
- **template/koa-rest-api:** Remove awkward request body from GET test ([#362](https://github.com/seek-oss/skuba/pull/362))
- **deps:** ejs ^3.1.6 ([#354](https://github.com/seek-oss/skuba/pull/354))

  Resolves [SNYK-JS-EJS-1049328](https://app.snyk.io/vuln/SNYK-JS-EJS-1049328).

- **init:** Mention GitHub repo creation ([#382](https://github.com/seek-oss/skuba/pull/382))

  skuba doesn't have access to GitHub credentials to create a repository on your behalf. The CLI now makes it clearer that you should create an empty GitHub repository.

- **template/lambda-sqs-worker:** Remove custom Serverless variable syntax ([#350](https://github.com/seek-oss/skuba/pull/350))

  `serverless@2.3.0` bundled native support for CloudFormation pseudo parameters. This even works with arbitrary logical IDs like `!Sub ${WorkerLambdaFunctionDeploymentGroup}`.

- **deps:** runtypes ^6.0.0 ([#406](https://github.com/seek-oss/skuba/pull/406))
- **deps:** ts-node-dev 1.1.6 ([#371](https://github.com/seek-oss/skuba/pull/371))
- **Jest:** Expose `testTimeout` in `Jest.mergePreset` options ([#389](https://github.com/seek-oss/skuba/pull/389))
- **template/lambda-sqs-worker:** Use new `serverless.yml#/package/patterns` property ([#415](https://github.com/seek-oss/skuba/pull/415))

  The `package.exclude` and `package.include` properties [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.32.0/docs/deprecations.md#new-way-to-define-packaging-patterns).

- **deps:** concurrently ^6.0.0 ([#379](https://github.com/seek-oss/skuba/pull/379))
- **deps:** typescript 4.1.5 ([#355](https://github.com/seek-oss/skuba/pull/355))
- **configure:** Rewrite `dist => lib` in `serverless.yml`s ([#387](https://github.com/seek-oss/skuba/pull/387))
- **template/\*-rest-api:** Move Gantry region config to plugin options ([#374](https://github.com/seek-oss/skuba/pull/374))
- **template:** Add GitHub repository settings and Renovate to init checklist ([#388](https://github.com/seek-oss/skuba/pull/388))

## 3.12.2

### Patch Changes

- **node:** Fix `src` module alias registration ([#344](https://github.com/seek-oss/skuba/pull/344))

## 3.12.1

### Patch Changes

- **node, start:** Propagate `process.argv` ([#341](https://github.com/seek-oss/skuba/pull/341))

  Passing command-line arguments into a script now works as expected:

  ```bash
  yarn skuba node src/script.ts arg1 arg2 arg3
  ```

- **node:** Support Node.js inspector options when running a script ([#341](https://github.com/seek-oss/skuba/pull/341))

  Passing an [inspector option](https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options) for script debugging now works as expected:

  ```bash
  yarn skuba node --inspect-brk src/script.ts
  ```

- **build-package, lint:** Run serially on Buildkite ([#343](https://github.com/seek-oss/skuba/pull/343))

  These commands now run their underlying processes serially when the `BUILDKITE` environment variable is set. This reduces the chance of resource exhaustion on smaller instance sizes but slows down builds.

- **template/koa-rest-api:** Tidy custom Koa types ([#336](https://github.com/seek-oss/skuba/pull/336))
- **test:** Exclude Jest `config.ts` files from coverage ([#340](https://github.com/seek-oss/skuba/pull/340))
- **template:** seek-jobs/gantry v1.2.11 ([#336](https://github.com/seek-oss/skuba/pull/336))

## 3.12.0

### Minor Changes

- **node:** Add command ([#298](https://github.com/seek-oss/skuba/pull/298))

  `skuba node` lets you run a TypeScript source file, or open a REPL if none is provided:
  - `skuba node src/some-cli-script.ts`
  - `skuba node`

  This automatically registers a `src` module alias for ease of local development. For example, you can run a prospective `src/someLocalCliScript.ts` without having to register a module alias resolver:

  ```typescript
  // This `src` module alias just works under `skuba node` and `skuba start`
  import { rootLogger } from 'src/framework/logging';
  ```

  ```bash
  yarn skuba node src/someLocalCliScript
  ```

  If you use this alias in your production code, your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`](https://github.com/seek-oss/skuba-dive#register). For example, your `src/app.ts` may look like:

  ```typescript
  // This must be imported directly within the `src` directory
  import 'skuba-dive/register';

  // You can use the `src` module alias after registration
  import { rootLogger } 'src/framework/logging';
  ```

- **node, start:** Support function entry points ([#301](https://github.com/seek-oss/skuba/pull/301))

  You can now specify an entry point that targets an exported function:

  ```bash
  skuba start --port 12345 src/app.ts#handler
  ```

  This starts up a local HTTP server that you can POST arguments to:

  ```bash
  curl --data '["event", {"awsRequestId": "123"}]' --include localhost:12345
  ```

  You may find this useful to run Lambda function handlers locally.

- **configure, help, init:** Check for newer skuba versions ([#300](https://github.com/seek-oss/skuba/pull/300))

  skuba will now print an upgrade command if there is a newer version available. You can now use a global installation without worrying that you're setting up new repos using outdated templates.

### Patch Changes

- **template/lambda-sqs-worker:** Simplify Buildkite pipeline ([#314](https://github.com/seek-oss/skuba/pull/314))
- **deps:** typescript 4.1.3 ([#297](https://github.com/seek-oss/skuba/pull/297))
- **template/koa-rest-api:** Type context ([#299](https://github.com/seek-oss/skuba/pull/299))
- **lint:** Detect incomplete templating ([#315](https://github.com/seek-oss/skuba/pull/315))
- **template:** Use `jest.config.ts` ([#303](https://github.com/seek-oss/skuba/pull/303))
- **template/lambda-sqs-worker:** Add smoke test ([#328](https://github.com/seek-oss/skuba/pull/328))

  This brings back versioned functions along with `serverless-prune-plugin` to control Lambda storage consumption. By default we configure `serverless-plugin-canary-deployments` for an instantaneous switch once the smoke test has passed, but this can be customised as necessary.

- **configure:** Add `test:watch` script ([#303](https://github.com/seek-oss/skuba/pull/303))
- **configure:** Migrate `jest.config.js` to `jest.config.ts` ([#303](https://github.com/seek-oss/skuba/pull/303))
- **template:** Enable retry of successful deployment steps ([#311](https://github.com/seek-oss/skuba/pull/311))

  This should be used with caution, but may be necessary if you need to rapidly roll back a broken deployment.

- **template/\*-rest-api:** Supply custom autoscaling policy ([#322](https://github.com/seek-oss/skuba/pull/322))
- **init:** Pick random server port ([#333](https://github.com/seek-oss/skuba/pull/333))
- **template/lambda-sqs-worker:** Add `start` script ([#301](https://github.com/seek-oss/skuba/pull/301))
- **template/\*-rest-api:** Explicitly register `listen.ts` ([#332](https://github.com/seek-oss/skuba/pull/332))
- **deps:** Bump caret ranges ([#309](https://github.com/seek-oss/skuba/pull/309))

  Resolves [SNYK-JS-SEMVERREGEX-1047770](https://app.snyk.io/vuln/SNYK-JS-SEMVERREGEX-1047770).

- **template/koa-rest-api:** Limit request logging to errors ([#294](https://github.com/seek-oss/skuba/pull/294))
- **start:** Improve support for non-HTTP server entry points ([#298](https://github.com/seek-oss/skuba/pull/298))

  You can now run arbitrary TypeScript files without them exiting on a `You must export callback or requestListener` error.

- **configure, init:** Improve error messaging in offline scenarios ([#305](https://github.com/seek-oss/skuba/pull/305))
- **template/\*-rest-api:** Clarify health checks and smoke tests ([#332](https://github.com/seek-oss/skuba/pull/332))
- **template/lambda-sqs-worker:** Require deployment bucket ([#330](https://github.com/seek-oss/skuba/pull/330))
- **pkg:** Remove ESM from skuba's bundle ([#296](https://github.com/seek-oss/skuba/pull/296))

  This simplifies our bundle; Node.js and skuba's CLI have always defaulted to CommonJS anyway.

- **start:** Support `src` module alias ([#298](https://github.com/seek-oss/skuba/pull/298))
- **node, start:** Support `--port` option ([#301](https://github.com/seek-oss/skuba/pull/301))
- **configure:** Remove `package-lock.json` ([#324](https://github.com/seek-oss/skuba/pull/324))
- **test:** Set `NODE_ENV=test` ([#326](https://github.com/seek-oss/skuba/pull/326))

  This is something that Jest itself does in its `bin/jest`.

- **template:** Bump caret ranges ([#331](https://github.com/seek-oss/skuba/pull/331))
- **start:** Support source maps ([#298](https://github.com/seek-oss/skuba/pull/298))
- **template/lambda-sqs-worker:** Lock Serverless `lambdaHashingVersion` ([#329](https://github.com/seek-oss/skuba/pull/329))

  This gets rid of the following warning when deploying:

  ```text
  Deprecation warning: Starting with next major version, default value of provider.lambdaHashingVersion will be equal to "20201221"
  More Info: https://www.serverless.com/framework/docs/deprecations/#LAMBDA_HASHING_VERSION_V2
  ```

- **deps:** Bump minor and patch versions ([#331](https://github.com/seek-oss/skuba/pull/331))
- **configure:** Ensure workspaced `package.json` is private ([#306](https://github.com/seek-oss/skuba/pull/306))
- **template/\*-rest-api:** Use Distroless runtime images ([#316](https://github.com/seek-oss/skuba/pull/316))
- **template:** Uplift READMEs ([#334](https://github.com/seek-oss/skuba/pull/334))

## 3.11.0

### Minor Changes

- **deps:** TypeScript 4.1 ([#269](https://github.com/seek-oss/skuba/pull/269))

  This includes formatting and linting support for new syntax features.

  See the [release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-4-1) for more information.

- **lint:** Check for unused `eslint-disable` directives ([#272](https://github.com/seek-oss/skuba/pull/272))

  `skuba lint` will now report on unnecessary `eslint-disable` directives that should be removed:

  ```diff
  - /* eslint-disable-next-line new-cap */
  const camelCase = 'no problems here';
  ```

### Patch Changes

- **template:** Check coverage on default `test` script ([#290](https://github.com/seek-oss/skuba/pull/290))
- **deps:** babel-plugin-macros ^3.0.0 ([#277](https://github.com/seek-oss/skuba/pull/277))
- **deps:** ts-node-dev 1.1.1 ([#288](https://github.com/seek-oss/skuba/pull/288))

  If you see the following error on `npm install`:

  ```bash
  npm ERR! enoent ENOENT: no such file or directory, chmod '.../node_modules/ts-node-dev/lib\bin.js'
  ```

  Try updating npm:

  ```bash
  npm -g install npm
  ```

- **template:** Include `test:watch` script ([#290](https://github.com/seek-oss/skuba/pull/290))
- **build:** Fix `--out-dir requires filenames` error on experimental Babel builds ([#291](https://github.com/seek-oss/skuba/pull/291))
- **deps:** eslint-config-skuba 1.0.10 ([#284](https://github.com/seek-oss/skuba/pull/284))
- **deps:** prettier 2.2.1 ([#278](https://github.com/seek-oss/skuba/pull/278))
- **start:** Support default export of Express listener ([#289](https://github.com/seek-oss/skuba/pull/289))
- **template/express-rest-api:** Fix server listener and port ([#289](https://github.com/seek-oss/skuba/pull/289))
- **template:** Lock `.nvmrc`s to Node.js 12 ([#281](https://github.com/seek-oss/skuba/pull/281))

## 3.10.2

### Patch Changes

- **deps:** typescript 4.0.5 ([#241](https://github.com/seek-oss/skuba/pull/241))
- **template:** Add `.me` files ([#248](https://github.com/seek-oss/skuba/pull/248))
- **deps:** semantic-release ^17.2.3 ([#263](https://github.com/seek-oss/skuba/pull/263))
- **template/lambda-sqs-worker:** Remove redundant `ecr` plugin ([#259](https://github.com/seek-oss/skuba/pull/259))
- **template:** seek-jobs/gantry v1.2.9 ([#249](https://github.com/seek-oss/skuba/pull/249))
- **template/koa-rest-api:** seek-koala ^5.0.0 ([#260](https://github.com/seek-oss/skuba/pull/260))
- **template:** supertest ^6.0.0 ([#243](https://github.com/seek-oss/skuba/pull/243))
- **template:** runtypes-filter ^0.4.0 ([#257](https://github.com/seek-oss/skuba/pull/257))
- **template:** @koa/router ^10.0.0 ([#249](https://github.com/seek-oss/skuba/pull/249))
- **template:** Mount working directory in Docker Compose ([#247](https://github.com/seek-oss/skuba/pull/247))
- **template/lambda-sqs-worker:** Default to unversioned Lambdas ([#245](https://github.com/seek-oss/skuba/pull/245))

  Our baseline template does not do canary deployments, and this makes it less likely to hit code storage limits down the road.

- **template:** seek-datadog-custom-metrics ^4.0.0 ([#261](https://github.com/seek-oss/skuba/pull/261))

## 3.10.1

### Patch Changes

- **deps:** Pin ts-node-dev 1.0.0-pre.63 ([#239](https://github.com/seek-oss/skuba/pull/239))

  This fixes errors on `npm install` on macOS and Linux. Yarn 1.x was unaffected by this issue.

- **template:** seek-jobs/gantry v1.2.8 ([#238](https://github.com/seek-oss/skuba/pull/238))

## 3.10.0

### Minor Changes

- **start:** Support default exports ([#90](https://github.com/seek-oss/skuba/pull/90))

  `skuba start` now works with a Koa application exported with `export default`. This syntax is preferred over `export =` for compatibility with tooling such as Babel.

- **start:** Support [Node.js debugging options](https://nodejs.org/en/docs/guides/debugging-getting-started/) ([#230](https://github.com/seek-oss/skuba/pull/230))

  [`skuba start`](https://seek-oss.github.io/skuba/docs/cli/run.html#skuba-start) now accepts `--inspect` and `--inspect-brk` options. This allows you to attach a debugger to the process.

- **init:** Redesign base prompt ([#234](https://github.com/seek-oss/skuba/pull/234))

  The base prompt no longer mandates a team name and supports copy+paste.

### Patch Changes

- **template/lambda-sqs-worker:** Remove region from subscription example snippet ([#223](https://github.com/seek-oss/skuba/pull/223))
- **template:** supertest ^5.0.0 ([#220](https://github.com/seek-oss/skuba/pull/220))
- **template/koa-rest-api:** hot-shots ^8.0.0 ([#217](https://github.com/seek-oss/skuba/pull/217))
- **deps:** Bump caret ranges ([#235](https://github.com/seek-oss/skuba/pull/235))
- **template:** Recommend `@seek/logger` ([#225](https://github.com/seek-oss/skuba/pull/225))

  This provides logging structure, trimming and redaction over plain Pino.

- **template:** docker-compose v3.7.0 ([#224](https://github.com/seek-oss/skuba/pull/224))
- **template:** Unset initial skuba version ([#216](https://github.com/seek-oss/skuba/pull/216))
- **template/greeter:** Align Dockerfile stages ([#219](https://github.com/seek-oss/skuba/pull/219))
- **template/koa-rest-api:** Avoid `export =` syntax ([#90](https://github.com/seek-oss/skuba/pull/90))
- **deps:** normalize-package-data ^3.0.0 ([#231](https://github.com/seek-oss/skuba/pull/231))
- **template:** Skip pre-build in Docker Compose service ([#222](https://github.com/seek-oss/skuba/pull/222))
- **template:** Add `start:debug` scripts ([#230](https://github.com/seek-oss/skuba/pull/230))

## 3.9.2

### Patch Changes

- **deps:** prettier 2.1.2 ([#207](https://github.com/seek-oss/skuba/pull/207))
- **template:** docker-compose v3.6.0 ([#210](https://github.com/seek-oss/skuba/pull/210))
- **template/lambda-sqs-worker:** serverless ^2.0.0 ([#203](https://github.com/seek-oss/skuba/pull/203))
- **deps:** eslint-config-skuba 1.0.8 ([#214](https://github.com/seek-oss/skuba/pull/214))

  This patch should reduce `@typescript-eslint` noise across JS files.

- **template/\*-rest-api:** seek-jobs/gantry v1.2.6 ([#211](https://github.com/seek-oss/skuba/pull/211))
- **deps:** typescript 4.0.3 ([#208](https://github.com/seek-oss/skuba/pull/208))
- **template/koa-rest-api:** Remove `koa-cluster` ([#206](https://github.com/seek-oss/skuba/pull/206))

  While Fargate environments with <= 1 vCPU appear to expose multiple threads,
  clustering does not improve performance and only serves to increase idle memory usage.

  You may add `koa-cluster` yourself if you have a CPU-bound workload running on multiple vCPUs.
  Even in such cases, it may be better to run multiple tasks with one vCPU each rather than one task with multiple vCPUs.

- **template:** Bump dep ranges ([#212](https://github.com/seek-oss/skuba/pull/212))
- **deps:** Bump minor ranges ([#214](https://github.com/seek-oss/skuba/pull/214))

## 3.9.1

### Patch Changes

- **start:** Allow execution despite typechecking errors ([#201](https://github.com/seek-oss/skuba/pull/201))
- **template/lambda-sqs-worker:** Include `aws-sdk` in bundle ([#198](https://github.com/seek-oss/skuba/pull/198))
- **build:** Support `tsc --build` flag ([#200](https://github.com/seek-oss/skuba/pull/200))
- **configure:** Remove direct `eslint-config-skuba` and `semantic-release` dependencies ([#195](https://github.com/seek-oss/skuba/pull/195))
- **build-package, lint:** Colour code subprocess output ([#190](https://github.com/seek-oss/skuba/pull/190))
- **build-package, lint:** Clean up error output ([#190](https://github.com/seek-oss/skuba/pull/190))
- **configure:** Clean up select `lint:xxx` scripts in `package.json` ([#196](https://github.com/seek-oss/skuba/pull/196))
- **test:** Resolve `@typescript-eslint/typescript-estree` warnings with TypeScript 4.0: ([#202](https://github.com/seek-oss/skuba/pull/202))

  ```text
  WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.
  ```

- **configure:** Use TypeScript 4.0 node factory API ([#193](https://github.com/seek-oss/skuba/pull/193))
- **lint:** [eslint-plugin-jest ^24.0.0](https://github.com/jest-community/eslint-plugin-jest/releases/v24.0.0) ([#202](https://github.com/seek-oss/skuba/pull/202))

  This enables a few additional linting rules by default.

## 3.9.0

### Minor Changes

- **deps:** [TypeScript 4.0](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/) ([#188](https://github.com/seek-oss/skuba/pull/188))

  This includes compatible versions of ESLint, Jest and Prettier. You may need to reformat your code with `yarn skuba format`.

  TypeScript 4.0 is largely backward compatible, but you may see errors if you [`delete` a required property](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/#operands-for-delete-must-be-optional):

  ```typescript
  const fn = (arg: { prop: string }) => {
    delete arg.prop;
    //     ~~~~~~
    // error! The operand of a 'delete' operator must be optional.
  };
  ```

- **lint:** Allow incremental typechecking ([#188](https://github.com/seek-oss/skuba/pull/188))

### Patch Changes

- **configure:** Fix bad import ([#187](https://github.com/seek-oss/skuba/pull/187))
- **template:** Use unknown catch clause variables ([#189](https://github.com/seek-oss/skuba/pull/189))
- **template/\*-npm-package:** Retain comments out of the box ([#184](https://github.com/seek-oss/skuba/pull/184))
- **template/lambda-sqs-worker:** Qualify `awsRequestId` log field ([#186](https://github.com/seek-oss/skuba/pull/186))

## 3.8.0

### Minor Changes

- **template/express-rest-api:** Add new template ([#176](https://github.com/seek-oss/skuba/pull/176))

### Patch Changes

- **deps:** ts-node ^9.0.0 ([#180](https://github.com/seek-oss/skuba/pull/180))
- **configure, template/\*-npm-package:** Pack JSON files ([#182](https://github.com/seek-oss/skuba/pull/182))
- **configure:** Retain package comments on first run ([#181](https://github.com/seek-oss/skuba/pull/181))
- **template:** seek-jobs/gantry v1.2.5 ([#174](https://github.com/seek-oss/skuba/pull/174))
- **template/\*-npm-package:** Avoid TSDoc linting errors on init ([#171](https://github.com/seek-oss/skuba/pull/171))

## 3.7.7

### Patch Changes

- **template/koa-rest-api:** Use per-Gantry environment concurrency group in dev ([#165](https://github.com/seek-oss/skuba/pull/165))
- **template:** seek-jobs/gantry v1.2.4 ([#170](https://github.com/seek-oss/skuba/pull/170))
- **template/koa-rest-api:** Simplify supertest-koa bootstrap ([#163](https://github.com/seek-oss/skuba/pull/163))
- **template:** Remove explicitly set NPM_READ_TOKEN from Dockerfile commands ([#168](https://github.com/seek-oss/skuba/pull/168))
- **deps:** Limit direct lodash usage to `lodash.mergewith` ([#167](https://github.com/seek-oss/skuba/pull/167))

## 3.7.6

### Patch Changes

- **template:** runtypes-filter ^0.3.0 ([#160](https://github.com/seek-oss/skuba/pull/160))
- **template/koa-rest-api:** Keep AWS SDK connections alive ([#159](https://github.com/seek-oss/skuba/pull/159))
- **deps:** runtypes ^5.0.0 ([#155](https://github.com/seek-oss/skuba/pull/155))
- **template:** seek-jobs/gantry v1.2.3 ([#161](https://github.com/seek-oss/skuba/pull/161))
- **deps:** typescript 3.9.7 ([#158](https://github.com/seek-oss/skuba/pull/158))
- **template:** docker-compose v3.5.0 ([#153](https://github.com/seek-oss/skuba/pull/153))
- **template:** runtypes ^5.0.0 ([#156](https://github.com/seek-oss/skuba/pull/156))
- **deps:** eslint-config-skuba 1.0.4 ([#157](https://github.com/seek-oss/skuba/pull/157))

## 3.7.5

### Patch Changes

- **template/lambda-sqs-worker:** Default VERSION to local ([#148](https://github.com/seek-oss/skuba/pull/148))
- **template/koa-rest-api:** Add intermediate Dockerfile stages ([#147](https://github.com/seek-oss/skuba/pull/147))
- **template:** ecr v2.1.1 ([#144](https://github.com/seek-oss/skuba/pull/144))
- **template/koa-rest-api:** Switch to Runtypes ([#152](https://github.com/seek-oss/skuba/pull/152))

  Yup has overly permissive input coercion (see #151) and weaker type guarantees.

  We already use Runtypes in the Lambda template; other options could be explored in future.

- **template/lambda-sqs-worker:** Use better Runtypes syntax ([#152](https://github.com/seek-oss/skuba/pull/152))
- **template:** docker-compose v3.4.0 ([#144](https://github.com/seek-oss/skuba/pull/144))
- **template:** Add basic deployment documentation ([#148](https://github.com/seek-oss/skuba/pull/148))

## 3.7.4

### Patch Changes

- **template/lambda-sqs-worker:** Use connection reuse environment variable ([#130](https://github.com/seek-oss/skuba/pull/130))
- **template:** Redact `err.config.agent` path from logs ([#140](https://github.com/seek-oss/skuba/pull/140))
- **deps:** typescript 3.9.6 ([#139](https://github.com/seek-oss/skuba/pull/139))
- **deps:** eslint-config-skuba 1.0.3 ([#139](https://github.com/seek-oss/skuba/pull/139))

## 3.7.3

### Patch Changes

- **test:** Fix `passWithNoTests` warning ([#128](https://github.com/seek-oss/skuba/pull/128))

## 3.7.2

### Patch Changes

- **configure:** Avoid stripping of `_` filename prefixes ([#119](https://github.com/seek-oss/skuba/pull/119))
- **configure:** Remove duplicate `lib` exclusions from `tsconfig.json` ([#124](https://github.com/seek-oss/skuba/pull/124))
- **test:** Add `Jest.mergePreset` helper function ([#126](https://github.com/seek-oss/skuba/pull/126))
- **format, lint:** Include tsx files in ESLint linting ([#123](https://github.com/seek-oss/skuba/pull/123))
- **deps:** eslint ^7.3.1 + eslint-config-skuba 1.0.1 ([#120](https://github.com/seek-oss/skuba/pull/120))
- **test:** Collect coverage from TSX files ([#125](https://github.com/seek-oss/skuba/pull/125))
- **configure:** Use simple ESLint extends syntax ([#122](https://github.com/seek-oss/skuba/pull/122))

## 3.7.1

### Patch Changes

- **configure:** Format Renovate config ([#111](https://github.com/seek-oss/skuba/pull/111))
- **configure, init:** Format `package.json` consistently ([#112](https://github.com/seek-oss/skuba/pull/112))

## 3.7.0

### Minor Changes

- **configure:** Support migration from `seek-module-toolkit` ([#66](https://github.com/seek-oss/skuba/pull/66))

  `seek-module-toolkit` users can now install `skuba` and run `skuba configure` to migrate their configuration.

  Care should be taken around the [change in build directories](https://seek-oss.github.io/skuba/docs/migration-guides/seek-module-toolkit.html#building).

- **eslint:** skuba is now usable as a shareable config ([#81](https://github.com/seek-oss/skuba/pull/81))

  ```javascript
  // .eslintrc.js

  module.exports = {
    // This can be used in place of require.resolve('skuba/config/eslint')
    extends: ['skuba'],
  };
  ```

- **build, start:** Support experimental Babel toolchain ([#85](https://github.com/seek-oss/skuba/pull/85))

  You can now build your project with Babel instead of tsc. Experimentally.

  See our [Babel topic](https://seek-oss.github.io/skuba/docs/deep-dives/babel.html) for details.

- **jest:** skuba is now usable as a preset ([#50](https://github.com/seek-oss/skuba/pull/50))

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

- **configure:** Replace relocated dependencies ([#54](https://github.com/seek-oss/skuba/pull/54))

  `skuba configure` now replaces the following dependencies and updates their import paths via naive find-and-replace:
  - `@seek/koala → seek-koala`
  - `@seek/node-datadog-custom-metrics → seek-datadog-custom-metrics`
  - `@seek/skuba → skuba`
  - `@seek/skuba-dive → skuba-dive`

- **init:** Commit initial template files and configure default remote ([#51](https://github.com/seek-oss/skuba/pull/51))
- **format, lint:** Enforce TSDoc syntax ([#75](https://github.com/seek-oss/skuba/pull/75))
- **template/oss-npm-package:** Add new template ([#73](https://github.com/seek-oss/skuba/pull/73))

  This is intended for [seek-oss](https://github.com/seek-oss) projects.

### Patch Changes

- **configure:** Delete `test:build` and `test:jest` scripts ([#95](https://github.com/seek-oss/skuba/pull/95))
- **configure:** List skuba upgrade upfront ([#68](https://github.com/seek-oss/skuba/pull/68))
- **configure, init:** Avoid unnecessary file writes during templating ([#48](https://github.com/seek-oss/skuba/pull/48))
- **template/lambda-sqs-worker:** Drop `hot-shots` dependency ([#57](https://github.com/seek-oss/skuba/pull/57))
- **configure, init:** Sort dependencies ([#52](https://github.com/seek-oss/skuba/pull/52))
- **template:** Redact `Authorization` headers in logs ([#59](https://github.com/seek-oss/skuba/pull/59))
- **template/\*-npm-package:** Make prompt unskippable ([#76](https://github.com/seek-oss/skuba/pull/76))
- **configure, init:** Exclude `lib-` directories from compilation ([#102](https://github.com/seek-oss/skuba/pull/102))
- **template/private-npm-package:** Fix ReferenceError on init ([#60](https://github.com/seek-oss/skuba/pull/60))
- **help:** Show `build-package` correctly ([#55](https://github.com/seek-oss/skuba/pull/55))
- **configure:** Migrate `collectCoverageFrom` Jest option ([#105](https://github.com/seek-oss/skuba/pull/105))
- **configure:** Tame newlines in ignore files ([#89](https://github.com/seek-oss/skuba/pull/89))
- **configure:** List filtered devDependencies upfront ([#67](https://github.com/seek-oss/skuba/pull/67))
- **configure, init:** `.dockerignore` the `.gantry` folder. This should decrease build times. ([#62](https://github.com/seek-oss/skuba/pull/62))
- **template/koa-rest-api:** Ensure lint passes on init ([#70](https://github.com/seek-oss/skuba/pull/70))
- **configure:** Sort more `package.json` props ([#101](https://github.com/seek-oss/skuba/pull/101))
- **init:** Install matching skuba version ([#83](https://github.com/seek-oss/skuba/pull/83))
- **init:** Extend validation on initial GitHub fields ([#49](https://github.com/seek-oss/skuba/pull/49))
- **template/\*-npm-package:** Drop module aliasing from `tsconfig.json` ([#75](https://github.com/seek-oss/skuba/pull/75))
- **template:** Redact `err.config.sockets` from logs ([#82](https://github.com/seek-oss/skuba/pull/82))
- **template/koa-rest-api:** Support improved Runtypes error messaging ([#96](https://github.com/seek-oss/skuba/pull/96))
- **configure:** Handle `skuba-dive` dependency upfront ([#79](https://github.com/seek-oss/skuba/pull/79))
- **configure:** Migrate select Jest options ([#100](https://github.com/seek-oss/skuba/pull/100))
- **configure:** Reserve skuba-managed sections in ignore files ([#58](https://github.com/seek-oss/skuba/pull/58))
- **configure, init:** `.gitignore` archives created by `npm pack` ([#78](https://github.com/seek-oss/skuba/pull/78))
- **template/private-npm-package:** Include a half-decent README ([#74](https://github.com/seek-oss/skuba/pull/74))
- **configure, init:** Make mentioned commands actually runnable ([#104](https://github.com/seek-oss/skuba/pull/104))
- **configure:** Clean up ignore files during migration ([#94](https://github.com/seek-oss/skuba/pull/94))
- **configure, init:** `.dockerignore` the `.git` folder. This should decrease build times. ([#61](https://github.com/seek-oss/skuba/pull/61))
- **configure:** Add notice for smt migrations ([#77](https://github.com/seek-oss/skuba/pull/77))
- **cli:** Suppress dependency deprecation warnings ([#108](https://github.com/seek-oss/skuba/pull/108))
- **configure:** Delete `.npmignore` ([#93](https://github.com/seek-oss/skuba/pull/93))
- **template:** Drop duplicate team name prompt ([#72](https://github.com/seek-oss/skuba/pull/72))
- **template/koa-rest-api:** Use Koala's error handler ([#44](https://github.com/seek-oss/skuba/pull/44))
- **configure, init:** Reduce unintended stripping of `_` filename prefix ([#106](https://github.com/seek-oss/skuba/pull/106))

## 3.6.0

### Minor Changes

- **template/private-npm-package:** Add new template ([#40](https://github.com/seek-oss/skuba/pull/40))

  The `private-npm-package` template replaces `smt init`.

  This change also defaults TypeScript's `moduleResolution` to `node`.
  This shouldn't break any existing consumers as it is the default resolution strategy for CommonJS.

### Patch Changes

- **template/koa-rest-api:** Remove unused function ([#35](https://github.com/seek-oss/skuba/pull/35))
- **init:** Redesign first prompt ([#42](https://github.com/seek-oss/skuba/pull/42))
- **cli:** Tweak prompt spacing and wording ([#39](https://github.com/seek-oss/skuba/pull/39))
- **template/koa-rest-api:** Pass through Gantry environment as ENVIRONMENT ([#37](https://github.com/seek-oss/skuba/pull/37))
- **deps:** Bump bundled and template dependencies ([#43](https://github.com/seek-oss/skuba/pull/43))

  This includes TypeScript 3.9.5.

## 3.5.1

### Patch Changes

- **format, lint:** Relax on Jest config files ([#31](https://github.com/seek-oss/skuba/pull/31))

## 3.5.0

### Minor Changes

- **format, lint:** ESLint 7 + `typescript-eslint` 3 ([#19](https://github.com/seek-oss/skuba/pull/19))

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

- **build-package:** Add opinionated command to replace `smt build` ([#15](https://github.com/seek-oss/skuba/pull/15))

  See the [migration documentation](https://seek-oss.github.io/skuba/docs/migration-guides/seek-module-toolkit.html) for more information.

### Patch Changes

- **init:** Restore `--silent` arg for `yarn add` ([#30](https://github.com/seek-oss/skuba/pull/30))
- **configure, init:** Tweak ignore file patterns ([#11](https://github.com/seek-oss/skuba/pull/11))

  Directory names like `/lib-es2015` are ignored based on prefix now,
  but certain patterns have been restricted to the root to allow for `/src/lib`.

- **configure:** Use `latest-version` to check package versions ([#24](https://github.com/seek-oss/skuba/pull/24))
- **configure, init:** Switch to oss `skuba-dive` package ([#21](https://github.com/seek-oss/skuba/pull/21))
- **template:** Switch to `seek-datadog-custom-metrics` ([#28](https://github.com/seek-oss/skuba/pull/28))
- **template/koa-rest-api:** Switch to `seek-koala` ([#28](https://github.com/seek-oss/skuba/pull/28))
- **configure:** Keep name, readme and version fields in package.json ([#18](https://github.com/seek-oss/skuba/pull/18))
- **configure:** Drop `--ignore-optional` from `yarn install` ([#25](https://github.com/seek-oss/skuba/pull/25))
- **start:** Remove support for a custom port logging function ([#16](https://github.com/seek-oss/skuba/pull/16))
- **init:** Drop `--ignore-optional --silent` from `yarn add` ([#25](https://github.com/seek-oss/skuba/pull/25))
- **template/koa-rest-api:** Bump Gantry plugin to v1.2.2 ([#8](https://github.com/seek-oss/skuba/pull/8))
- **deps:** Declare `@types/jest` as a peer dependency ([#22](https://github.com/seek-oss/skuba/pull/22))
- **format, lint:** Group `'src'` import along with `'src/**'` ([#7](https://github.com/seek-oss/skuba/pull/7))
- **configure, init:** Exclude files from templating based on .gitignore ([#20](https://github.com/seek-oss/skuba/pull/20))

## 3.4.1

### Patch Changes

- **pkg:** Release on `seek-oss` ([#4](https://github.com/seek-oss/skuba/pull/4))
