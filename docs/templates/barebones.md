---
nav_order: 1
parent: Templates
---

# Barebones

---

## greeter

A minimal "Hello, World!" project.

Packs enough Buildkite, Docker and Jest configuration to put you on track for production.

[View on GitHub](https://github.com/seek-oss/skuba/tree/main/template/greeter)


Added in [3.4.1](https://github.com/seek-oss/skuba/releases/tag/v3.4.1)

<details markdown="block">
  <summary>
    Changelog
  </summary>
  {: .text-delta }

- [13.0.0](https://github.com/seek-oss/skuba/releases/tag/v13.0.0): Remove Splunk references ([#2096](https://github.com/seek-oss/skuba/pull/2096))

- [12.0.0](https://github.com/seek-oss/skuba/releases/tag/v12.0.0): Use `mount-buildkite-agent` for Docker Buildkite plugins ([#1944](https://github.com/seek-oss/skuba/pull/1944))

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

- [11.1.0](https://github.com/seek-oss/skuba/releases/tag/v11.1.0): Migrate to Zod 4 ([#1930](https://github.com/seek-oss/skuba/pull/1930))

- [11.1.0](https://github.com/seek-oss/skuba/releases/tag/v11.1.0): Replace logger spies with [`@seek/logger` destination mocks](https://github.com/seek-oss/logger/blob/master/docs/testing.md) ([#1923](https://github.com/seek-oss/skuba/pull/1923))

- [11.0.0](https://github.com/seek-oss/skuba/releases/tag/v11.0.0): Use simplified npm private access ([#1858](https://github.com/seek-oss/skuba/pull/1858))

  This change to templates removes [`private-npm`](https://github.com/seek-oss/private-npm-buildkite-plugin/) and [`aws-sm`](https://github.com/seek-oss/aws-sm-buildkite-plugin/) Buildkite plugins, instead using the `GET_NPM_TOKEN` environment variable helper.

  Read more at **skuba**’s new [npm guide](https://seek-oss.github.io/skuba/docs/deep-dives/npm.html).

- [10.0.0](https://github.com/seek-oss/skuba/releases/tag/v10.0.0): Upgrade to Node 22 ([#1789](https://github.com/seek-oss/skuba/pull/1789))

- [10.0.0](https://github.com/seek-oss/skuba/releases/tag/v10.0.0): Align with latest AWS tagging guidance ([#1782](https://github.com/seek-oss/skuba/pull/1782))

- [9.0.0](https://github.com/seek-oss/skuba/releases/tag/v9.0.0): Point Docker base images to AWS ECR Public and remove constant `--platform` arguments ([#1684](https://github.com/seek-oss/skuba/pull/1684))

- [8.2.1](https://github.com/seek-oss/skuba/releases/tag/v8.2.1): Remove JSON schema definitions from Buildkite pipeline files ([#1624](https://github.com/seek-oss/skuba/pull/1624))

  This reverts [#1611](https://github.com/seek-oss/skuba/pull/1611) due to incompatibility with pipeline signing.

- [8.2.1](https://github.com/seek-oss/skuba/releases/tag/v8.2.1): docker-compose v5.3.0 ([#1620](https://github.com/seek-oss/skuba/pull/1620))

- [8.2.0](https://github.com/seek-oss/skuba/releases/tag/v8.2.0): Add JSON schema definitions to Buildkite pipeline files ([#1611](https://github.com/seek-oss/skuba/pull/1611))

- [8.1.0](https://github.com/seek-oss/skuba/releases/tag/v8.1.0): Add extension recommendations to `.vscode/extensions.json` ([#1556](https://github.com/seek-oss/skuba/pull/1556))

- [8.1.0](https://github.com/seek-oss/skuba/releases/tag/v8.1.0): Make all configuration values explicit ([#1560](https://github.com/seek-oss/skuba/pull/1560))

  Previously, `src/config.ts` included optional configuration values and inheritance between environments in the spirit of [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself). While the templated file was wired up in a "safe" way—the production environment never inherited from other environments and explicitly specified all its configuration values—its pattern was misappropriated elsewhere and led to local configuration values affecting production environments.

  Instead, we now list all configuration values explicitly against each environment.

- [8.1.0](https://github.com/seek-oss/skuba/releases/tag/v8.1.0): Remove deprecated `docker-compose.yml` version ([#1570](https://github.com/seek-oss/skuba/pull/1570))

  Docker has ignored this for a while, and now generates a warning on every build:
  https://github.com/compose-spec/compose-spec/blob/master/04-version-and-name.md

- [8.0.1](https://github.com/seek-oss/skuba/releases/tag/v8.0.1): Install specific pnpm version via Corepack ([#1515](https://github.com/seek-oss/skuba/pull/1515))

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

- [8.0.0](https://github.com/seek-oss/skuba/releases/tag/v8.0.0): Remove `BUILDPLATFORM` from Dockerfiles ([#1350](https://github.com/seek-oss/skuba/pull/1350))

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

- [8.0.0](https://github.com/seek-oss/skuba/releases/tag/v8.0.0): Remove account-level tags from resources ([#1494](https://github.com/seek-oss/skuba/pull/1494))

  This partially reverts [#1459](https://github.com/seek-oss/skuba/pull/1459) and [#1461](https://github.com/seek-oss/skuba/pull/1461) to avoid unnecessary duplication of account-level tags in our templates.

- [7.4.0](https://github.com/seek-oss/skuba/releases/tag/v7.4.0): Use `propagate-environment` for Docker Compose Buildkite plugin ([#1392](https://github.com/seek-oss/skuba/pull/1392))

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

- [7.3.1](https://github.com/seek-oss/skuba/releases/tag/v7.3.1): Update to Node 20 ([#1317](https://github.com/seek-oss/skuba/pull/1317))

  Consider upgrading the Node.js version for your project across:
  - `.nvmrc`
  - `package.json#/engines/node`
  - `serverless.yml`
  - `@types/node` package version
  - CI/CD configuration (`.buildkite/pipeline.yml`, `Dockerfile`, etc.)

  If you are updating your AWS Lambda runtime to `nodejs20.x`, consider reading the [release announcement](https://aws.amazon.com/blogs/compute/node-js-20-x-runtime-now-available-in-aws-lambda/) as there are some breaking changes with this upgrade.

- [7.3.0](https://github.com/seek-oss/skuba/releases/tag/v7.3.0): seek-oss/docker-ecr-cache 2.1 ([#1266](https://github.com/seek-oss/skuba/pull/1266))

  This update brings a [new `skip-pull-from-cache` option](https://github.com/seek-oss/docker-ecr-cache-buildkite-plugin#skipping-image-pull-from-cache) which is useful on `Warm`/`Build Cache` steps.

  At SEEK, our build agents no longer persist their Docker build cache from previous steps. This option allows a preparatory step to proceed on a cache hit without pulling the image from ECR, which can save on average ~1 minute per build for a 2GB Docker image.

- [7.3.0](https://github.com/seek-oss/skuba/releases/tag/v7.3.0): Mount npm build secret to a separate directory ([#1278](https://github.com/seek-oss/skuba/pull/1278))

  Our templated Buildkite pipelines currently retrieve a temporary `.npmrc`. This file contains an npm read token that allows us to fetch private `@seek`-scoped packages.

  New projects now write this file to `/tmp/` on the Buildkite agent and mount it as a secret to `/root/` in Docker. This separation allows you to commit a non-sensitive `.npmrc` to your GitHub repository while avoiding accidental exposure of the npm read token. This is especially important if you are migrating a project to [pnpm](https://pnpm.io/), which houses some of its configuration options in `.npmrc`.

  Existing projects are generally advised to wait until we've paved a cleaner migration path for pnpm.

- [7.0.0](https://github.com/seek-oss/skuba/releases/tag/v7.0.0): Require Node.js 18.12+ ([#1206](https://github.com/seek-oss/skuba/pull/1206))

- [6.2.0](https://github.com/seek-oss/skuba/releases/tag/v6.2.0): Include manifest files in CODEOWNERS ([#1162](https://github.com/seek-oss/skuba/pull/1162))

  Our templates previously excluded `package.json` and `yarn.lock` from CODEOWNERS. This was intended to support advanced workflows such as auto-merging PRs and augmenting GitHub push notifications with custom tooling. However, we are reverting this configuration as it is more common for SEEKers to prefer a simpler CODEOWNERS-based workflow.

  This will not affect existing projects. If you create a new project and wish to restore the previous behaviour, you can manually extend `.github/CODEOWNERS`:

  ```diff
  * @<%- ownerName %>

  + # Configured by Renovate
  + package.json
  + yarn.lock
  ```

- [5.1.0](https://github.com/seek-oss/skuba/releases/tag/v5.1.0): Prompt for target platform (`amd64` or `arm64`) ([#1041](https://github.com/seek-oss/skuba/pull/1041))

- [5.0.0](https://github.com/seek-oss/skuba/releases/tag/v5.0.0): Bump greeter and API templates to Node.js 18 ([#1011](https://github.com/seek-oss/skuba/pull/1011))

  Node.js 18 is now in active LTS. The Lambda templates are stuck on Node.js 16 until the new AWS Lambda runtime is released.

- [5.0.0](https://github.com/seek-oss/skuba/releases/tag/v5.0.0): Support AMD64 Docker builds via `BUILDPLATFORM` ([#1021](https://github.com/seek-oss/skuba/pull/1021))

  See the [Docker documentation](https://docs.docker.com/build/building/multi-platform/#building-multi-platform-images) for more information. Note that this does not allow you to build on AMD64 hardware then deploy to ARM64 hardware and vice versa. It is provided for convenience if you need to revert to an AMD64 workflow and/or build and run an image on local AMD64 hardware.

- [4.3.1](https://github.com/seek-oss/skuba/releases/tag/v4.3.1): Fix README link to ARM64 guide ([#913](https://github.com/seek-oss/skuba/pull/913))

- [4.3.0](https://github.com/seek-oss/skuba/releases/tag/v4.3.0): Remove `.me` files ([#902](https://github.com/seek-oss/skuba/pull/902))

  SEEK is moving away from Codex to off-the-shelf software powered by Backstage `catalog-info.yaml` files.

  At the moment we're only asking teams to document their systems, which typically span across multiple repositories. We may add `catalog-info.yaml` files back to the templates if there's a need for teams to document their components at a repository level.

- [4.3.0](https://github.com/seek-oss/skuba/releases/tag/v4.3.0): Use ARM64 architecture ([#873](https://github.com/seek-oss/skuba/pull/873))

  We now recommend building and running projects on ARM64 hardware for greater cost efficiency. This requires a Graviton-based Buildkite cluster; see our [ARM64 guide](https://seek-oss.github.io/skuba/docs/deep-dives/arm64.html) for more information.

- [4.2.1](https://github.com/seek-oss/skuba/releases/tag/v4.2.1): Time out Buildkite test steps after 10 minutes ([#842](https://github.com/seek-oss/skuba/pull/842))

  Successful testing and linting should complete within this window. This timeout prevents commands from hanging and indefinitely preoccupying your Buildkite agents.

  ```diff
  steps:
    - label: 🧪 Test & Lint
  +   timeout_in_minutes: 10
  ```

- [4.2.0](https://github.com/seek-oss/skuba/releases/tag/v4.2.0): Propagate Buildkite environment variables for lint autofixing ([#800](https://github.com/seek-oss/skuba/pull/800))

- [4.2.0](https://github.com/seek-oss/skuba/releases/tag/v4.2.0): Exclude DOM type definitions by default ([#822](https://github.com/seek-oss/skuba/pull/822))

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

- [4.1.1](https://github.com/seek-oss/skuba/releases/tag/v4.1.1): Disable type checking in tests ([#787](https://github.com/seek-oss/skuba/pull/787))

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

- [4.1.1](https://github.com/seek-oss/skuba/releases/tag/v4.1.1): Specify default Buildkite agent ([#775](https://github.com/seek-oss/skuba/pull/775))

- [4.1.0](https://github.com/seek-oss/skuba/releases/tag/v4.1.0): skuba-dive ^2.0.0 ([#766](https://github.com/seek-oss/skuba/pull/766))

- [4.0.0](https://github.com/seek-oss/skuba/releases/tag/v4.0.0): Use `--enable-source-maps` ([#761](https://github.com/seek-oss/skuba/pull/761))

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

- [3.17.0](https://github.com/seek-oss/skuba/releases/tag/v3.17.0): Retrieve GitHub token on Test & Lint ([#667](https://github.com/seek-oss/skuba/pull/667))

- [3.17.0](https://github.com/seek-oss/skuba/releases/tag/v3.17.0): serverless-prune-plugin ^2.0.0 ([#719](https://github.com/seek-oss/skuba/pull/719))

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): Use correct `environment` key in `docker-compose.yml` ([#654](https://github.com/seek-oss/skuba/pull/654))

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): Bump non-Lambda templates to Node.js 16 ([#633](https://github.com/seek-oss/skuba/pull/633))

  Node.js 16 is now in active LTS. The Lambda templates are stuck on Node.js 14 until the new AWS Lambda runtime is released.

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): seek-jobs/gantry v1.5.2 ([#634](https://github.com/seek-oss/skuba/pull/634))

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): hot-shots ^9.0.0 ([#639](https://github.com/seek-oss/skuba/pull/639))

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): @seek/logger ^5.0.0 ([#621](https://github.com/seek-oss/skuba/pull/621))

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): Ignore `.gantry` YAML paths via `.prettierignore` ([#636](https://github.com/seek-oss/skuba/pull/636))

  Gantry resource and value files often live in the `.gantry` subdirectory and may use non-standard template syntax.

- [3.16.0](https://github.com/seek-oss/skuba/releases/tag/v3.16.0): Propagate environment variables for GitHub annotations ([#642](https://github.com/seek-oss/skuba/pull/642))

  This enables GitHub annotations for newly-initialised projects with the appropriate Buildkite configuration.

- [3.15.2](https://github.com/seek-oss/skuba/releases/tag/v3.15.2): Remove README tables of contents ([#596](https://github.com/seek-oss/skuba/pull/596))

  GitHub's Markdown renderer now generates its own table of contents.

- [3.15.2](https://github.com/seek-oss/skuba/releases/tag/v3.15.2): seek-jobs/gantry v1.5.1 ([#604](https://github.com/seek-oss/skuba/pull/604))

- [3.15.2](https://github.com/seek-oss/skuba/releases/tag/v3.15.2): pino-pretty ^6.0.0 ([#594](https://github.com/seek-oss/skuba/pull/594))

  pino-pretty@7 requires pino@7, which has not been released on its stable channel yet.

- [3.15.1](https://github.com/seek-oss/skuba/releases/tag/v3.15.1): Remove `unknown` specifier in catch clauses ([#580](https://github.com/seek-oss/skuba/pull/580))

  Strict TypeScript 4.4 now defaults to typing catch clause variables as `unknown`.

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): pino-pretty ^7.0.0 ([#506](https://github.com/seek-oss/skuba/pull/506))

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): Configure environment variables and volume mounts for Buildkite annotations ([#558](https://github.com/seek-oss/skuba/pull/558))

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): serverless-plugin-canary-deployments ^0.7.0 ([#508](https://github.com/seek-oss/skuba/pull/508))

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): seek-jobs/gantry v1.4.1 ([#504](https://github.com/seek-oss/skuba/pull/504))

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): Remove `@types/node` resolution override ([#498](https://github.com/seek-oss/skuba/pull/498))

  Jest 27.1 is compatible with newer versions of `@types/node`.

- [3.15.0](https://github.com/seek-oss/skuba/releases/tag/v3.15.0): Remove Yarn cache from worker Docker images ([#499](https://github.com/seek-oss/skuba/pull/499))

  This shrinks the cached Docker images that our worker templates generate.

- [3.14.4](https://github.com/seek-oss/skuba/releases/tag/v3.14.4): @types/node ^14.17.19 ([#490](https://github.com/seek-oss/skuba/pull/490))

- [3.14.4](https://github.com/seek-oss/skuba/releases/tag/v3.14.4): seek-jobs/gantry v1.4.0 ([#483](https://github.com/seek-oss/skuba/pull/483))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): seek-oss/docker-ecr-cache v1.11.0 ([#467](https://github.com/seek-oss/skuba/pull/467))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Add `test:ci` script ([#473](https://github.com/seek-oss/skuba/pull/473))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Force `@jest/types` resolution to fix clean installs ([#468](https://github.com/seek-oss/skuba/pull/468))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Use [Docker Build secrets](https://docs.docker.com/develop/develop-images/build_enhancements/#new-docker-build-secret-information) ([#476](https://github.com/seek-oss/skuba/pull/476))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Group Buildkite pipeline anchors ([#474](https://github.com/seek-oss/skuba/pull/474))

  This provides a bit more structure to our `pipeline.yml`s and allows anchored plugins to be recognised by Renovate.

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Default Docker Compose image to empty string ([#469](https://github.com/seek-oss/skuba/pull/469))

  This suppresses Docker Compose CLI warnings and errors when running outside of Buildkite.

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Use BUILDKITE_PIPELINE_DEFAULT_BRANCH in `pipeline.yml` ([#475](https://github.com/seek-oss/skuba/pull/475))

- [3.14.3](https://github.com/seek-oss/skuba/releases/tag/v3.14.3): Add placeholder test coverage configuration ([#472](https://github.com/seek-oss/skuba/pull/472))

- [3.14.2](https://github.com/seek-oss/skuba/releases/tag/v3.14.2): Use `seek-oss/docker-ecr-cache` Buildkite plugin ([#453](https://github.com/seek-oss/skuba/pull/453))

- [3.14.2](https://github.com/seek-oss/skuba/releases/tag/v3.14.2): Reuse ECR cache in Docker Compose ([#453](https://github.com/seek-oss/skuba/pull/453))

- [3.14.1](https://github.com/seek-oss/skuba/releases/tag/v3.14.1): pino-pretty ^5.0.0 ([#441](https://github.com/seek-oss/skuba/pull/441))

- [3.14.1](https://github.com/seek-oss/skuba/releases/tag/v3.14.1): seek-jobs/gantry v1.3.0 ([#452](https://github.com/seek-oss/skuba/pull/452))

- [3.14.0](https://github.com/seek-oss/skuba/releases/tag/v3.14.0): Banish `typeof undefined` syntax ([#429](https://github.com/seek-oss/skuba/pull/429))

- [3.14.0](https://github.com/seek-oss/skuba/releases/tag/v3.14.0): Prune `devDependencies` instead of installing twice in Docker ([#435](https://github.com/seek-oss/skuba/pull/435))

  The template-bundled Dockerfiles would previously run `yarn install` twice to build a separate stage for production `dependencies` only. These have been updated to correctly share the Yarn cache across stages and to use `yarn install --production` to perform offline pruning.

- [3.13.1](https://github.com/seek-oss/skuba/releases/tag/v3.13.1): @types/node ^15.0.0 ([#422](https://github.com/seek-oss/skuba/pull/422))

- [3.13.0](https://github.com/seek-oss/skuba/releases/tag/v3.13.0): Upgrade to Node 14 ([#347](https://github.com/seek-oss/skuba/pull/347))

  Node.js 14 is [now supported on AWS Lambda](https://aws.amazon.com/about-aws/whats-new/2021/02/aws-lambda-now-supports-node-js-14/). This lets us upgrade the Node.js requirement for skuba's templates.

  This should only impact newly created projects. You can use the template changes in this PR as an example of how to upgrade an existing project. A future version of skuba may include a fixup command to automatically upgrade your project to the most recent LTS release.

- [3.13.0](https://github.com/seek-oss/skuba/releases/tag/v3.13.0): runtypes-filter ^0.6.0 ([#408](https://github.com/seek-oss/skuba/pull/408))

- [3.13.0](https://github.com/seek-oss/skuba/releases/tag/v3.13.0): Drop region parameterisation ([#363](https://github.com/seek-oss/skuba/pull/363))

- [3.13.0](https://github.com/seek-oss/skuba/releases/tag/v3.13.0): runtypes ^6.0.0 ([#404](https://github.com/seek-oss/skuba/pull/404))

- [3.13.0](https://github.com/seek-oss/skuba/releases/tag/v3.13.0): Add GitHub repository settings and Renovate to init checklist ([#388](https://github.com/seek-oss/skuba/pull/388))

- [3.12.1](https://github.com/seek-oss/skuba/releases/tag/v3.12.1): seek-jobs/gantry v1.2.11 ([#336](https://github.com/seek-oss/skuba/pull/336))

- [3.12.0](https://github.com/seek-oss/skuba/releases/tag/v3.12.0): Use `jest.config.ts` ([#303](https://github.com/seek-oss/skuba/pull/303))

- [3.12.0](https://github.com/seek-oss/skuba/releases/tag/v3.12.0): Enable retry of successful deployment steps ([#311](https://github.com/seek-oss/skuba/pull/311))

  This should be used with caution, but may be necessary if you need to rapidly roll back a broken deployment.

- [3.12.0](https://github.com/seek-oss/skuba/releases/tag/v3.12.0): Bump caret ranges ([#331](https://github.com/seek-oss/skuba/pull/331))

- [3.12.0](https://github.com/seek-oss/skuba/releases/tag/v3.12.0): Uplift READMEs ([#334](https://github.com/seek-oss/skuba/pull/334))

- [3.11.0](https://github.com/seek-oss/skuba/releases/tag/v3.11.0): Check coverage on default `test` script ([#290](https://github.com/seek-oss/skuba/pull/290))

- [3.11.0](https://github.com/seek-oss/skuba/releases/tag/v3.11.0): Include `test:watch` script ([#290](https://github.com/seek-oss/skuba/pull/290))

- [3.11.0](https://github.com/seek-oss/skuba/releases/tag/v3.11.0): Lock `.nvmrc`s to Node.js 12 ([#281](https://github.com/seek-oss/skuba/pull/281))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): Add `.me` files ([#248](https://github.com/seek-oss/skuba/pull/248))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): seek-jobs/gantry v1.2.9 ([#249](https://github.com/seek-oss/skuba/pull/249))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): supertest ^6.0.0 ([#243](https://github.com/seek-oss/skuba/pull/243))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): runtypes-filter ^0.4.0 ([#257](https://github.com/seek-oss/skuba/pull/257))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): @koa/router ^10.0.0 ([#249](https://github.com/seek-oss/skuba/pull/249))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): Mount working directory in Docker Compose ([#247](https://github.com/seek-oss/skuba/pull/247))

- [3.10.2](https://github.com/seek-oss/skuba/releases/tag/v3.10.2): seek-datadog-custom-metrics ^4.0.0 ([#261](https://github.com/seek-oss/skuba/pull/261))

- [3.10.1](https://github.com/seek-oss/skuba/releases/tag/v3.10.1): seek-jobs/gantry v1.2.8 ([#238](https://github.com/seek-oss/skuba/pull/238))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): supertest ^5.0.0 ([#220](https://github.com/seek-oss/skuba/pull/220))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): Recommend `@seek/logger` ([#225](https://github.com/seek-oss/skuba/pull/225))

  This provides logging structure, trimming and redaction over plain Pino.

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): docker-compose v3.7.0 ([#224](https://github.com/seek-oss/skuba/pull/224))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): Unset initial skuba version ([#216](https://github.com/seek-oss/skuba/pull/216))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): Align Dockerfile stages ([#219](https://github.com/seek-oss/skuba/pull/219))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): Skip pre-build in Docker Compose service ([#222](https://github.com/seek-oss/skuba/pull/222))

- [3.10.0](https://github.com/seek-oss/skuba/releases/tag/v3.10.0): Add `start:debug` scripts ([#230](https://github.com/seek-oss/skuba/pull/230))

- [3.9.2](https://github.com/seek-oss/skuba/releases/tag/v3.9.2): docker-compose v3.6.0 ([#210](https://github.com/seek-oss/skuba/pull/210))

- [3.9.2](https://github.com/seek-oss/skuba/releases/tag/v3.9.2): Bump dep ranges ([#212](https://github.com/seek-oss/skuba/pull/212))

- [3.9.0](https://github.com/seek-oss/skuba/releases/tag/v3.9.0): Use unknown catch clause variables ([#189](https://github.com/seek-oss/skuba/pull/189))

- [3.8.0](https://github.com/seek-oss/skuba/releases/tag/v3.8.0): seek-jobs/gantry v1.2.5 ([#174](https://github.com/seek-oss/skuba/pull/174))

- [3.7.7](https://github.com/seek-oss/skuba/releases/tag/v3.7.7): seek-jobs/gantry v1.2.4 ([#170](https://github.com/seek-oss/skuba/pull/170))

- [3.7.7](https://github.com/seek-oss/skuba/releases/tag/v3.7.7): Remove explicitly set NPM_READ_TOKEN from Dockerfile commands ([#168](https://github.com/seek-oss/skuba/pull/168))

- [3.7.6](https://github.com/seek-oss/skuba/releases/tag/v3.7.6): runtypes-filter ^0.3.0 ([#160](https://github.com/seek-oss/skuba/pull/160))

- [3.7.6](https://github.com/seek-oss/skuba/releases/tag/v3.7.6): seek-jobs/gantry v1.2.3 ([#161](https://github.com/seek-oss/skuba/pull/161))

- [3.7.6](https://github.com/seek-oss/skuba/releases/tag/v3.7.6): docker-compose v3.5.0 ([#153](https://github.com/seek-oss/skuba/pull/153))

- [3.7.6](https://github.com/seek-oss/skuba/releases/tag/v3.7.6): runtypes ^5.0.0 ([#156](https://github.com/seek-oss/skuba/pull/156))

- [3.7.5](https://github.com/seek-oss/skuba/releases/tag/v3.7.5): ecr v2.1.1 ([#144](https://github.com/seek-oss/skuba/pull/144))

- [3.7.5](https://github.com/seek-oss/skuba/releases/tag/v3.7.5): docker-compose v3.4.0 ([#144](https://github.com/seek-oss/skuba/pull/144))

- [3.7.5](https://github.com/seek-oss/skuba/releases/tag/v3.7.5): Add basic deployment documentation ([#148](https://github.com/seek-oss/skuba/pull/148))

- [3.7.4](https://github.com/seek-oss/skuba/releases/tag/v3.7.4): Redact `err.config.agent` path from logs ([#140](https://github.com/seek-oss/skuba/pull/140))

- [3.7.0](https://github.com/seek-oss/skuba/releases/tag/v3.7.0): Redact `Authorization` headers in logs ([#59](https://github.com/seek-oss/skuba/pull/59))

- [3.7.0](https://github.com/seek-oss/skuba/releases/tag/v3.7.0): Redact `err.config.sockets` from logs ([#82](https://github.com/seek-oss/skuba/pull/82))

- [3.7.0](https://github.com/seek-oss/skuba/releases/tag/v3.7.0): Drop duplicate team name prompt ([#72](https://github.com/seek-oss/skuba/pull/72))

- [3.5.0](https://github.com/seek-oss/skuba/releases/tag/v3.5.0): Switch to `seek-datadog-custom-metrics` ([#28](https://github.com/seek-oss/skuba/pull/28))

</details>

