# skuba

## 3.12.2

### Patch Changes

- 0b2c1e0: **node:** Fix `src` module alias registration

## 3.12.1

### Patch Changes

- 8fce1be: **node, start:** Propagate `process.argv`

  Passing command-line arguments into a script now works as expected:

  ```bash
  yarn skuba node src/script.ts arg1 arg2 arg3
  ```

- 8fce1be: **node:** Support Node.js inspector options when running a script

  Passing an [inspector option](https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options) for script debugging now works as expected:

  ```bash
  yarn skuba node --inspect-brk src/script.ts
  ```

- 45ca22d: **build-package, lint:** Run serially on Buildkite

  These commands now run their underlying processes serially when the `BUILDKITE` environment variable is set. This reduces the chance of resource exhaustion on smaller instance sizes but slows down builds.

- 56fe586: **template/koa-rest-api:** Tidy custom Koa types
- a3e1821: **test:** Exclude Jest `config.ts` files from coverage
- 56fe586: **template:** seek-jobs/gantry v1.2.11

## 3.12.0

### Minor Changes

- 641accc: **node:** Add command

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

  If you use this alias in your production code, your production entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`](https://github.com/seek-oss/skuba-dive#register). For example, your `src/app.ts` may look like:

  ```typescript
  // This must be imported directly within the `src` directory
  import 'skuba-dive/register';

  // You can use the `src` module alias after registration
  import { rootLogger } 'src/framework/logging';
  ```

- 334f38b: **node, start:** Support function entry points

  You can now specify an entry point that targets an exported function:

  ```bash
  skuba start --port 12345 src/app.ts#handler
  ```

  This starts up a local HTTP server that you can POST arguments to:

  ```bash
  curl --data '["event", {"awsRequestId": "123"}]' --include localhost:12345
  ```

  You may find this useful to run Lambda function handlers locally.

- e1dab09: **configure, help, init:** Check for newer skuba versions

  skuba will now print an upgrade command if there is a newer version available. You can now use a global installation without worrying that you're setting up new repos using outdated templates.

### Patch Changes

- 30bc4e7: **template/lambda-sqs-worker:** Simplify Buildkite pipeline
- 65f3e14: **deps:** typescript 4.1.3
- ceb394f: **template/koa-rest-api:** Type context
- 8c87be4: **lint:** Detect incomplete templating
- 5ad44ae: **template:** Use `jest.config.ts`
- 0774f98: **template/lambda-sqs-worker:** Add smoke test

  This brings back versioned functions along with `serverless-prune-plugin` to control Lambda storage consumption. By default we configure `serverless-plugin-canary-deployments` for an instantaneous switch once the smoke test has passed, but this can be customised as necessary.

- 5ad44ae: **configure:** Add `test:watch` script
- 5ad44ae: **configure:** Migrate `jest.config.js` to `jest.config.ts`
- 2d2bf99: **template:** Enable retry of successful deployment steps

  This should be used with caution, but may be necessary if you need to rapidly roll back a broken deployment.

- 2d0dc1a: **template/\*-rest-api:** Supply custom autoscaling policy
- b7cbee2: **init:** Pick random server port
- 334f38b: **template/lambda-sqs-worker:** Add `start` script
- e7254c1: **template/\*-rest-api:** Explicitly register `listen.ts`
- 141c802: **deps:** Bump caret ranges

  Resolves [SNYK-JS-SEMVERREGEX-1047770](https://app.snyk.io/vuln/SNYK-JS-SEMVERREGEX-1047770).

- 9002d51: **template/koa-rest-api:** Limit request logging to errors
- 641accc: **start:** Improve support for non-HTTP server entry points

  You can now run arbitrary TypeScript files without them exiting on a `You must export callback or requestListener` error.

- 6074e53: **configure, init:** Improve error messaging in offline scenarios
- e7254c1: **template/\*-rest-api:** Clarify health checks and smoke tests
- d5afa4d: **template/lambda-sqs-worker:** Require deployment bucket
- 7e9a062: **pkg:** Remove ESM from skuba's bundle

  This simplifies our bundle; Node.js and skuba's CLI have always defaulted to CommonJS anyway.

- 641accc: **start:** Support `src` module alias
- 334f38b: **node, start:** Support `--port` option
- 8745cb0: **configure:** Remove `package-lock.json`
- 739ce3a: **test:** Set `NODE_ENV=test`

  This is something that Jest itself does in its `bin/jest`.

- 359a9be: **template:** Bump caret ranges
- 641accc: **start:** Support source maps
- d7aca2a: **template/lambda-sqs-worker:** Lock Serverless `lambdaHashingVersion`

  This gets rid of the following warning when deploying:

  ```text
  Deprecation warning: Starting with next major version, default value of provider.lambdaHashingVersion will be equal to "20201221"
  More Info: https://www.serverless.com/framework/docs/deprecations/#LAMBDA_HASHING_VERSION_V2
  ```

- 359a9be: **deps:** Bump minor and patch versions
- c3dab88: **configure:** Ensure workspaced `package.json` is private
- ece7dd4: **template/\*-rest-api:** Use Distroless runtime images
- 88705b4: **template:** Uplift READMEs

## 3.11.0

### Minor Changes

- 8158e01: **deps:** TypeScript 4.1

  This includes formatting and linting support for new syntax features.

  See the [release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-4-1) for more information.

- da45f2d: **lint:** Check for unused `eslint-disable` directives

  `skuba lint` will now report on unnecessary `eslint-disable` directives that should be removed:

  ```diff
  - /* eslint-disable-next-line new-cap */
  const camelCase = 'no problems here';
  ```

### Patch Changes

- a6984b1: **template:** Check coverage on default `test` script
- 8d53d81: **deps:** babel-plugin-macros ^3.0.0
- 7c9683b: **deps:** ts-node-dev 1.1.1

  If you see the following error on `npm install`:

  ```bash
  npm ERR! enoent ENOENT: no such file or directory, chmod '.../node_modules/ts-node-dev/lib\bin.js'
  ```

  Try updating npm:

  ```bash
  npm -g install npm
  ```

- a6984b1: **template:** Include `test:watch` script
- f04b01b: **build:** Fix `--out-dir requires filenames` error on experimental Babel builds
- 02b2372: **deps:** eslint-config-skuba 1.0.10
- 21a68fb: **deps:** prettier 2.2.1
- 04aa18a: **start:** Support default export of Express listener
- 04aa18a: **template/express-rest-api:** Fix server listener and port
- dd63af8: **template:** Lock `.nvmrc`s to Node.js 12

## 3.10.2

### Patch Changes

- 0b862d8: **deps:** typescript 4.0.5
- 0944235: **template:** Add `.me` files
- 2a2edf2: **deps:** semantic-release ^17.2.3
- 2b39134: **template/lambda-sqs-worker:** Remove redundant `ecr` plugin
- 6d07e61: **template:** seek-jobs/gantry v1.2.9
- 5e4183f: **template/koa-rest-api:** seek-koala ^5.0.0
- 45fc156: **template:** supertest ^6.0.0
- 08be91c: **template:** runtypes-filter ^0.4.0
- 6d07e61: **template:** @koa/router ^10.0.0
- ff2e956: **template:** Mount working directory in Docker Compose
- c71bcb7: **template/lambda-sqs-worker:** Default to unversioned Lambdas

  Our baseline template does not do canary deployments, and this makes it less likely to hit code storage limits down the road.

- d3d6187: **template:** seek-datadog-custom-metrics ^4.0.0

## 3.10.1

### Patch Changes

- 9c0bbac: **deps:** Pin ts-node-dev 1.0.0-pre.63

  This fixes errors on `npm install` on macOS and Linux. Yarn 1.x was unaffected by this issue.

- ab2047f: **template:** seek-jobs/gantry v1.2.8

## 3.10.0

### Minor Changes

- ea1de97: **start:** Support default exports

  `skuba start` now works with a Koa application exported with `export default`. This syntax is preferred over `export =` for compatibility with tooling such as Babel.

- 4cc1a15: **start:** Support [Node.js debugging options](https://nodejs.org/en/docs/guides/debugging-getting-started/)

  [`skuba start`](https://github.com/seek-oss/skuba#skuba-start) now accepts `--inspect` and `--inspect-brk` options. This allows you to attach a debugger to the process.

- 4e63643: **init:** Redesign base prompt

  The base prompt no longer mandates a team name and supports copy+paste.

### Patch Changes

- 4bfeb6b: **template/lambda-sqs-worker:** Remove region from subscription example snippet
- d246d85: **template:** supertest ^5.0.0
- f0bf058: **template/koa-rest-api:** hot-shots ^8.0.0
- 7b747a5: **deps:** Bump caret ranges
- 644efa5: **template:** Recommend `@seek/logger`

  This provides logging structure, trimming and redaction over plain Pino.

- 8e7af71: **template:** docker-compose v3.7.0
- 5243bfc: **template:** Unset initial skuba version
- 15de9c9: **template/greeter:** Align Dockerfile stages
- ea1de97: **template/koa-rest-api:** Avoid `export =` syntax
- 9a67a61: **deps:** normalize-package-data ^3.0.0
- 0c643f6: **template:** Skip pre-build in Docker Compose service
- 4cc1a15: **template:** Add `start:debug` scripts

## 3.9.2

### Patch Changes

- 319fbe0: **deps:** prettier 2.1.2
- 353661f: **template:** docker-compose v3.6.0
- 3689322: **template/lambda-sqs-worker:** serverless ^2.0.0
- 6f55875: **deps:** eslint-config-skuba 1.0.8

  This patch should reduce `@typescript-eslint` noise across JS files.

- 6d04736: **template/\*-rest-api:** seek-jobs/gantry v1.2.6
- dc1e305: **deps:** typescript 4.0.3
- b520b3f: **template/koa-rest-api:** Remove `koa-cluster`

  While Fargate environments with <= 1 vCPU appear to expose multiple threads,
  clustering does not improve performance and only serves to increase idle memory usage.

  You may add `koa-cluster` yourself if you have a CPU-bound workload running on multiple vCPUs.
  Even in such cases, it may be better to run multiple tasks with one vCPU each rather than one task with multiple vCPUs.

- 2657cda: **template:** Bump dep ranges
- 6f55875: **deps:** Bump minor ranges

## 3.9.1

### Patch Changes

- b4f3681: **start:** Allow execution despite typechecking errors
- 2a1f9e6: **template/lambda-sqs-worker:** Include `aws-sdk` in bundle
- 399e32c: **build:** Support `tsc --build` flag
- 2051cc4: **configure:** Remove direct `eslint-config-skuba` and `semantic-release` dependencies
- 40ea2bd: **build-package, lint:** Colour code subprocess output
- 40ea2bd: **build-package, lint:** Clean up error output
- 13c5f8d: **configure:** Clean up select `lint:xxx` scripts in `package.json`
- 68465e3: **test:** Resolve `@typescript-eslint/typescript-estree` warnings with TypeScript 4.0:

  ```text
  WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.
  ```

- a32f018: **configure:** Use TypeScript 4.0 node factory API
- 68465e3: **lint:** [eslint-plugin-jest ^24.0.0](https://github.com/jest-community/eslint-plugin-jest/releases/v24.0.0)

  This enables a few additional linting rules by default.

## 3.9.0

### Minor Changes

- f9bbd95: **deps:** [TypeScript 4.0](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/)

  This includes compatible versions of ESLint, Jest and Prettier. You may need to reformat your code with `yarn skuba format`.

  TypeScript 4.0 is largely backward compatible, but you may see errors if you [`delete` a required property](https://devblogs.microsoft.com/typescript/announcing-typescript-4-0/#operands-for-delete-must-be-optional):

  ```typescript
  const fn = (arg: { prop: string }) => {
    delete arg.prop;
    //     ~~~~~~
    // error! The operand of a 'delete' operator must be optional.
  };
  ```

- f9bbd95: **lint:** Allow incremental typechecking

### Patch Changes

- 2f55d43: **configure:** Fix bad import
- b8fbbac: **template:** Use unknown catch clause variables
- 6b21991: **template/\*-npm-package:** Retain comments out of the box
- 57b9d78: **template/lambda-sqs-worker:** Qualify `awsRequestId` log field

## 3.8.0

### Minor Changes

- 1f8de87: **template/express-rest-api:** Add new template

### Patch Changes

- d79fdb1: **deps:** ts-node ^9.0.0
- 97e0e92: **configure, template/\*-npm-package:** Pack JSON files
- 3ae5457: **configure:** Retain package comments on first run
- 3cd34ef: **template:** seek-jobs/gantry v1.2.5
- cd83fea: **template/\*-npm-package:** Avoid TSDoc linting errors on init

## 3.7.7

### Patch Changes

- 1736ff8: **template/koa-rest-api:** Use per-Gantry environment concurrency group in dev
- 57498b4: **template:** seek-jobs/gantry v1.2.4
- aaae12a: **template/koa-rest-api:** Simplify supertest-koa bootstrap
- 9648312: **template:** Remove explicitly set NPM_READ_TOKEN from Dockerfile commands
- 0390727: **deps:** Limit direct lodash usage to `lodash.mergewith`

## 3.7.6

### Patch Changes

- b77cd84: **template:** runtypes-filter ^0.3.0
- 6ea01ae: **template/koa-rest-api:** Keep AWS SDK connections alive
- 4595add: **deps:** runtypes ^5.0.0
- 6bd4e6f: **template:** seek-jobs/gantry v1.2.3
- ee95847: **deps:** typescript 3.9.7
- d6986fb: **template:** docker-compose v3.5.0
- 99fa456: **template:** runtypes ^5.0.0
- 190a8fa: **deps:** eslint-config-skuba 1.0.4

## 3.7.5

### Patch Changes

- 5df28e9: **template/lambda-sqs-worker:** Default VERSION to local
- 693236b: **template/koa-rest-api:** Add intermediate Dockerfile stages
- ea706cf: **template:** ecr v2.1.1
- 8a4fdfe: **template/koa-rest-api:** Switch to Runtypes

  Yup has overly permissive input coercion (see #151) and weaker type guarantees.

  We already use Runtypes in the Lambda template; other options could be explored in future.

- 8a4fdfe: **template/lambda-sqs-worker:** Use better Runtypes syntax
- ea706cf: **template:** docker-compose v3.4.0
- 5df28e9: **template:** Add basic deployment documentation

## 3.7.4

### Patch Changes

- c0b8f1c: **template/lambda-sqs-worker:** Use connection reuse environment variable
- 7752ba4: **template:** Redact `err.config.agent` path from logs
- d3de8a6: **deps:** typescript 3.9.6
- d3de8a6: **deps:** eslint-config-skuba 1.0.3

## 3.7.3

### Patch Changes

- 24e2b99: **test:** Fix `passWithNoTests` warning

## 3.7.2

### Patch Changes

- b479be2: **configure:** Avoid stripping of `_` filename prefixes
- 6bc00bd: **configure:** Remove duplicate `lib` exclusions from `tsconfig.json`
- 9146b4a: **test:** Add `Jest.mergePreset` helper function
- 192d7ba: **format, lint:** Include tsx files in ESLint linting
- f6098e7: **deps:** eslint ^7.3.1 + eslint-config-skuba 1.0.1
- f1f4a5c: **test:** Collect coverage from TSX files
- b0b694d: **configure:** Use simple ESLint extends syntax

## 3.7.1

### Patch Changes

- a25d7a1: **configure:** Format Renovate config
- 92729fd: **configure, init:** Format `package.json` consistently

## 3.7.0

### Minor Changes

- 7a967cd: **configure:** Support migration from `seek-module-toolkit`

  `seek-module-toolkit` users can now install `skuba` and run `skuba configure` to migrate their configuration.

  Care should be taken around the [change in build directories](https://github.com/seek-oss/skuba/blob/master/docs/migrating-from-seek-module-toolkit.md#building).

- f2f3925: **eslint:** skuba is now usable as a shareable config

  ```javascript
  // .eslintrc.js

  module.exports = {
    // This can be used in place of require.resolve('skuba/config/eslint')
    extends: ['skuba'],
  };
  ```

- 03a7ac2: **build, start:** Support experimental Babel toolchain

  You can now build your project with Babel instead of tsc. Experimentally.

  See [docs/babel.md](https://github.com/seek-oss/skuba/tree/master/docs/babel.md) for details.

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

- 5c138fb: **configure:** Replace relocated dependencies

  `skuba configure` now replaces the following dependencies and updates their import paths via naive find-and-replace:

  - `@seek/koala → seek-koala`
  - `@seek/node-datadog-custom-metrics → seek-datadog-custom-metrics`
  - `@seek/skuba → skuba`
  - `@seek/skuba-dive → skuba-dive`

- b85b4b3: **init:** Commit initial template files and configure default remote
- cbce20b: **format, lint:** Enforce TSDoc syntax
- f39abdc: **template/oss-npm-package:** Add new template

  This is intended for [seek-oss](https://github.com/seek-oss) projects.

### Patch Changes

- 205f27d: **configure:** Delete `test:build` and `test:jest` scripts
- 0cbe50e: **configure:** List skuba upgrade upfront
- 5ec72d5: **configure, init:** Avoid unnecessary file writes during templating
- 5753b38: **template/lambda-sqs-worker:** Drop `hot-shots` dependency
- 0c1e129: **configure, init:** Sort dependencies
- 93cdf6c: **template:** Redact `Authorization` headers in logs
- 1b9b9c4: **template/package:** Make prompt unskippable
- 5283618: **configure, init**: Exclude `lib-` directories from compilation
- 676030a: **template/private-npm-package:** Fix ReferenceError on init
- f36b136: **help:** Show `build-package` correctly
- 1b7641f: **configure:** Migrate `collectCoverageFrom` Jest option
- 967603c: **configure:** Tame newlines in ignore files
- 9edfd74: **configure:** List filtered devDependencies upfront
- 8f862f5: **configure, init:** `.dockerignore` the `.gantry` folder. This should decrease build times.
- 14e7b92: **template/koa-rest-api:** Ensure lint passes on init
- 35b4b2e: **configure:** Sort more `package.json` props
- 23d4e09: **init:** Install matching skuba version
- bac749a: **init:** Extend validation on initial GitHub fields
- cbce20b: **template/package:** Drop module aliasing from `tsconfig.json`
- b480dac: **template:** Redact `err.config.sockets` from logs
- a52b995: **template/koa-rest-api:** Support improved Runtypes error messaging
- 1fbb097: **configure:** Handle `skuba-dive` dependency upfront
- fe86bdf: **configure:** Migrate select Jest options
- 72c2e2c: **configure:** Reserve skuba-managed sections in ignore files
- 77744b7: **configure, init:** `.gitignore` archives created by `npm pack`
- bea10c7: **template/private-npm-package:** Include a half-decent README
- 1b960a8: **configure, init:** Make mentioned commands actually runnable
- 573ea6e: **configure:** Clean up ignore files during migration
- eac8ae5: **configure, init:** `.dockerignore` the `.git` folder. This should decrease build times.
- 63d9f01: **configure:** Add notice for smt migrations
- b6296ac: **cli:** Suppress dependency deprecation warnings
- fe3a1a2: **configure:** Delete `.npmignore`
- 56cc9ef: **template:** Drop duplicate team name prompt
- 2169513: **template/koa-rest-api:** Use Koala's error handler
- aa6e1e8: **configure, init:** Reduce unintended stripping of `_` filename prefix

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
