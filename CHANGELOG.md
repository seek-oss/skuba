# skuba

## 3.15.3-beta.0

### Patch Changes

- **template:** Bump non-Lambda templates to Node.js 16 ([#633](https://github.com/seek-oss/skuba/pull/633))

  Node.js 16 is now in active LTS. The Lambda templates are stuck on Node.js 14 until the new AWS Lambda runtime is released.

- **template:** seek-jobs/gantry v1.5.2 ([#634](https://github.com/seek-oss/skuba/pull/634))

- **deps:** typescript 4.4.4 ([#616](https://github.com/seek-oss/skuba/pull/616))

- **deps:** Relax ranges ([#622](https://github.com/seek-oss/skuba/pull/622))

  Projects can now upgrade to new Prettier and TypeScript patches and `ts-node-dev` minors without us having to cut a new release.

- **deps:** eslint-config-skuba 1.0.12 ([#623](https://github.com/seek-oss/skuba/pull/623))

- **template:** hot-shots ^9.0.0 ([#639](https://github.com/seek-oss/skuba/pull/639))

- **template/lambda-sqs-worker:** Remove `pino.Logger` indirection ([#624](https://github.com/seek-oss/skuba/pull/624))

- **template:** @seek/logger ^5.0.0 ([#621](https://github.com/seek-oss/skuba/pull/621))

- **template:** Ignore `.gantry` YAML paths via `.prettierignore` ([#636](https://github.com/seek-oss/skuba/pull/636))

  Gantry resource and value files often live in the `.gantry` subdirectory and may use non-standard template syntax.

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

  See our [Buildkite guide](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/buildkite.md) for more information.

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

  There's limited upside to switching to [Babel-based builds](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/babel.md) for backend use cases, and it would be difficult to guarantee backwards compatibility with existing `tsconfig.json`-based configuration. Dropping Babel dependencies reduces our package size and resolves [SNYK-JS-SETVALUE-1540541](https://app.snyk.io/vuln/SNYK-JS-SETVALUE-1540541).

- **lint:** Support Buildkite annotations ([#558](https://github.com/seek-oss/skuba/pull/558))

  `skuba lint` can now output issues as Buildkite annotations.

  See our [Buildkite guide](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/buildkite.md) for more information.

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

  [`skuba start`](https://github.com/seek-oss/skuba/blob/master/docs/cli/run.md#skuba-start) now accepts `--inspect` and `--inspect-brk` options. This allows you to attach a debugger to the process.

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

  Care should be taken around the [change in build directories](https://github.com/seek-oss/skuba/blob/master/docs/migration-guides/seek-module-toolkit.md#building).

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

  See our [Babel topic](https://github.com/seek-oss/skuba/tree/master/docs/deep-dives/babel.md) for details.

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

  See the [migration documentation](https://github.com/seek-oss/skuba/blob/master/docs/migration-guides/seek-module-toolkit.md) for more information.

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
