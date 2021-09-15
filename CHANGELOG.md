# skuba

## 3.14.4

### Patch Changes

- d60f561: **template:** @types/node ^14.17.19
- 5b74f50: **template:** seek-jobs/gantry v1.4.0
- 66059b6: **deps:** @types/jest ^27.0.0
- 3ca9796: **template/\*-rest-api:** Parameterise AWS region

## 3.14.3

### Patch Changes

- 0973818: **template:** seek-oss/docker-ecr-cache v1.11.0
- 5b00ffa: **template:** Add `test:ci` script
- 2be05f5: **template:** Force `@jest/types` resolution to fix clean installs
- df2d5d3: **template/lambda-sqs-worker:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)
- df2d5d3: **template/greeter:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)
- df2d5d3: **template/lambda-sqs-worker-cdk:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)
- e9a71d4: **template:** Group Buildkite pipeline anchors

  This provides a bit more structure to our `pipeline.yml`s and allows anchored plugins to be recognised by Renovate.

- 1216a45: **deps:** ts-node-dev 1.1.8
- 985ff9a: **template/express-rest-api:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)
- 3e1005e: **template/\*-rest-api:** Reduce app boilerplate
- ee44447: **template:** Default Docker Compose image to empty string

  This suppresses Docker Compose CLI warnings and errors when running outside of Buildkite.

- ec9a44a: **template:** Use BUILDKITE_PIPELINE_DEFAULT_BRANCH in `pipeline.yml`
- 3f0f14d: **configure, init:** Deduplicate dependencies
- 37503f5: **template:** Add placeholder test coverage configuration
- 5b09594: **template/lambda-sqs-worker-\*:** Build once upfront

  This employs Buildkite [artifacts](https://buildkite.com/docs/pipelines/artifacts) to share compiled code with each subsequent deployment step.

- e9375b2: **deps:** TypeScript 4.3.5
- 985ff9a: **template/koa-rest-api:** Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information)

## 3.14.2

### Patch Changes

- e359a67: **deps:** TypeScript 4.3.4
- f3531e5: **deps:** prettier 2.3.2
- 274efe2: **template/koa-rest-api:** Include success message in smoke test body
- 3042866: **template/greeter:** Use `seek-oss/docker-ecr-cache` Buildkite plugin
- b113d33: **template/lambda-sqs-worker:** Set `memorySize` for smoke test hook to 128 MiB
- 3042866: **template/koa-rest-api:** Use `seek-oss/docker-ecr-cache` Buildkite plugin
- 3042866: **template/express-rest-api:** Use `seek-oss/docker-ecr-cache` Buildkite plugin
- 3042866: **template:** Reuse ECR cache in Docker Compose
- 42cf80d: **deps:** ts-node-dev 1.1.7

  Resolves [CVE-2021-33623](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-33623).

## 3.14.1

### Patch Changes

- 503ec47: **deps:** Prettier 2.3.1

  `skuba format` and `skuba lint` now support TypeScript 4.3 syntax. See the full Prettier [changelog](https://github.com/prettier/prettier/blob/4b4499a0d86220f4c393dc93140e2bac7992d0f4/CHANGELOG.md#%E2%80%8B231) for more information.

- 156663c: **template:** pino-pretty ^5.0.0
- 3ff82d0: **template:** seek-jobs/gantry v1.3.0

## 3.14.0

### Minor Changes

- 88ad97f: **deps:** Prettier 2.3

  This release may require reformatting of your code. If your lint step is failing in CI, run your format command locally then push the resulting changes.

  ```shell
  yarn format
  ```

- 88ad97f: **deps:** TypeScript 4.3

  This major release includes breaking changes. See the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-3/) for more information.

  `skuba format` and `skuba lint` will error on new TypeScript 4.3 syntax that are not yet supported by Prettier.

- 28c62d4: **deps:** Jest 27

  This major release includes breaking changes. See the Jest 27 [blog post](https://jestjs.io/blog/2021/05/25/jest-27) and [changelog](https://github.com/facebook/jest/blob/v27.0.3/CHANGELOG.md) for more information.

### Patch Changes

- 7ec71e8: **Jest.mergePreset:** Type `snapshotSerializers` option
- 1742096: **template:** Banish `typeof undefined` syntax
- 8842f92: **template/lambda-sqs-worker-cdk:** Always build before deploy

  This prevents stale compiled code from being cached and deployed from ECR.

- 1b72b4b: **template/koa-rest-api:** Log returned error responses
- 50792c8: **template:** Prune `devDependencies` instead of installing twice in Docker

  The template-bundled Dockerfiles would previously run `yarn install` twice to build a separate stage for production `dependencies` only. These have been updated to correctly share the Yarn cache across stages and to use `yarn install --production` to perform offline pruning.

- d4ef636: **deps:** fs-extra ^10.0.0

## 3.13.1

### Patch Changes

- 4ecd622: **template/\*-npm-package:** Add `yarn commit` script
- 94f3c4d: **template/lambda-sqs-worker-cdk:** Trim CDK deployment output
- bc0d95d: **template:** @types/node ^15.0.0
- e2d79cc: **deps:** typescript 4.2.4

  See the [announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-4-2/) for features and breaking changes. Note that the currently bundled version of Prettier does not support `abstract` construct signatures.

- 94f3c4d: **template/lambda-sqs-worker-cdk:** Fix npm token in Buildkite pipeline

## 3.13.0

### Minor Changes

- 13b3bce: **template/lambda-sqs-worker-cdk:** Add new template
- 78c9a48: **format, lint:** Support `--debug` flag
- e7cd7ed: **all**: Upgrade templates to Node 14

  Node.js 14 is [now supported on AWS Lambda](https://aws.amazon.com/about-aws/whats-new/2021/02/aws-lambda-now-supports-node-js-14/). This lets us upgrade the Node.js requirement for skuba's templates.

  This should only impact newly created projects. You can use the template changes in this PR as an example of how to upgrade an existing project. A future version of skuba may include a fixup command to automatically upgrade your project to the most recent LTS release.

### Patch Changes

- 7b9c728: **template/lambda-sqs-worker:** Use new `serverless.yml#/provider/iam` grouping

  The `provider.iamRoleStatements` property [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.25.1/docs/deprecations.md#grouping-iam-settings-under-provideriam).

- 612c04c: **template/lambda-sqs-worker:** serverless-plugin-canary-deployments ^0.5.0

  The plugin now patches in CodeDeploy permissions to your `iamRoleStatements`, so you can clean your `serverless.yml`:

  ```diff
  - - Action: codedeploy:PutLifecycleEventHookExecutionStatus
  -   Effect: Allow
  -   Resource: !Sub arn:aws:codedeploy:${AWS::Region}:${AWS::AccountId}:deploymentgroup:*/${WorkerLambdaFunctionDeploymentGroup}
  ```

- 44e53be: **template:** runtypes-filter ^0.6.0
- ae29b0c: **template/koa-rest-api:** Fix ineffectual smoke test
- fc4096c: **template:** Drop region parameterisation
- c3bd37d: **deps:** semantic-release ^17.3.8

  Resolves [SNYK-JS-MARKED-1070800](https://app.snyk.io/vuln/SNYK-JS-MARKED-1070800).

- a343814: **template/\*-rest-api:** Fail Gantry build if ECR scanning reports vulnerabilities
- ab0b8d2: **template:** runtypes ^6.0.0
- 1a78efa: **template/koa-rest-api:** Remove awkward request body from GET test
- fdda527: **deps:** ejs ^3.1.6

  Resolves [SNYK-JS-EJS-1049328](https://app.snyk.io/vuln/SNYK-JS-EJS-1049328).

- 0124032: **init:** Mention GitHub repo creation

  skuba doesn't have access to GitHub credentials to create a repository on your behalf. The CLI now makes it clearer that you should create an empty GitHub repository.

- b762058: **template/lambda-sqs-worker:** Remove custom Serverless variable syntax

  `serverless@2.3.0` bundled native support for CloudFormation pseudo parameters. This even works with arbitrary logical IDs like `!Sub ${WorkerLambdaFunctionDeploymentGroup}`.

- bd22fe0: **deps:** runtypes ^6.0.0
- 4cb3c48: **deps:** ts-node-dev 1.1.6
- adfe1e9: **Jest:** Expose `testTimeout` in `Jest.mergePreset` options
- 6797255: **template/lambda-sqs-worker:** Use new `serverless.yml#/package/patterns` property

  The `package.exclude` and `package.include` properties [will be removed in Serverless v3](https://github.com/serverless/serverless/blob/v2.32.0/docs/deprecations.md#new-way-to-define-packaging-patterns).

- e55907e: **deps:** concurrently ^6.0.0
- cc6a5c9: **deps:** typescript 4.1.5
- 8f17be6: **configure:** Rewrite `dist => lib` in `serverless.yml`s
- a80fed6: **template/\*-rest-api:** Move Gantry region config to plugin options
- 8926a5c: **template:** Add GitHub repository settings and Renovate to init checklist

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

  If you use this alias in your production code, your entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`](https://github.com/seek-oss/skuba-dive#register). For example, your `src/app.ts` may look like:

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

  Care should be taken around the [change in build directories](https://github.com/seek-oss/skuba/blob/master/docs/migration-guides/seek-module-toolkit.md#building).

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

  See our [Babel topic](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/babel.md) for details.

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

  See the [migration documentation](https://github.com/seek-oss/skuba/blob/master/docs/migration-guides/seek-module-toolkit.md) for more information.

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
