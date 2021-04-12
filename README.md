# 🤿

```text
    ╭─╮     ╭─╮
╭───│ ╰─╭─┬─╮ ╰─╮───╮
│_ ─┤  <│ ╵ │ • │ • │
╰───╰─┴─╰───╯───╯── ╰
```

[![GitHub Release](https://github.com/seek-oss/skuba/workflows/Release/badge.svg?branch=master)](https://github.com/seek-oss/skuba/actions?query=workflow%3ARelease)
[![GitHub Validate](https://github.com/seek-oss/skuba/workflows/Validate/badge.svg?branch=master)](https://github.com/seek-oss/skuba/actions?query=workflow%3AValidate)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D%2012-brightgreen)](https://nodejs.org/en/)
[![npm package](https://img.shields.io/npm/v/skuba)](https://www.npmjs.com/package/skuba)

Toolkit for backend application and package development on SEEK's gravel and paved roads:

- Write in TypeScript
- Enforce coding standards with ESLint and Prettier
- Test with Jest
- Deploy with [Gantry] / [Serverless]

Related reading:

- [SEEK's Technology Strategy]
- SEEK's frontend development toolkit, [sku]

[seek's technology strategy]: https://tech-strategy.ssod.skinfra.xyz
[sku]: https://github.com/seek-oss/sku

## Table of contents

- [Getting started](#getting-started)
- [CLI reference](#cli-reference)
- [Development API reference](#development-api-reference)
- [Runtime API reference](#runtime-api-reference)
- [Design](#design)
- [Contributing](https://github.com/seek-oss/skuba/tree/master/CONTRIBUTING.md)

## Getting started

**skuba** provides you with:

- Commands for developing your project
- Templates to base your backend application on

To create a new project:

```shell
npx skuba init
```

To bootstrap an existing project:

```shell
npx skuba configure
```

**skuba** supports a global installation to speed up local development:

```shell
yarn global add skuba

# Look, no `npx`!
skuba version
```

## CLI reference

**skuba** commands are typically found in the `scripts` section of `package.json`.

They replace direct calls to underlying tooling like `eslint` and `tsc`.

[`skuba configure`]: #skuba-configure
[`skuba format`]: #skuba-format

### `skuba build`

Compile the project.

By convention, this points to a `tsconfig.build.json` that excludes tests from your production bundle.

```jsonc
// tsconfig.build.json
{
  "exclude": ["**/__mocks__/**/*", "**/*.test.ts", "src/testing/**/*"],
  "extends": "tsconfig.json",
  "include": ["src/**/*"]
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "outDir": "lib"
  },
  "exclude": ["lib*/**/*"]
}
```

Run [`skuba configure`] if you don't have this file.

### `skuba build-package`

Compile the project for compatibility with CommonJS and ES2015 modules.

This is useful for building npm packages, and serves as a replacement for [`smt build`].

[`smt build`]: docs/migrating-from-seek-module-toolkit.md#building

### `skuba configure`

Bootstrap an existing project.

This provides a step-by-step prompt for replacing your config with **skuba**'s.

You should have a clean working tree before running this command,
so it's easy to `git reset` in case you want to restore your original config.

### `skuba format`

Apply automatic fixes to code quality and flag issues that require manual intervention.

This script should be run locally before pushing code to a remote branch.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

### `skuba help`

```shell
skuba
skuba help
skuba -h
skuba --help
```

Echoes the available **skuba** commands.

### `skuba init`

Create a new project.

This initialises a new directory and Git repository.

**skuba** supports the following template options:

- `express-rest-api`

  A REST [resource API] built on the [Express] web framework and deployed with [Gantry].

- `greeter`

  A minimal _hello world_ project.

  Packs enough Buildkite, Docker and Jest configuration to put you on track for production.

- `koa-rest-api`

  A REST [resource API] built on the [Koa] web framework and deployed with [Gantry].

- `lambda-sqs-worker`

  An asynchronous [worker] built on [AWS Lambda] and deployed with [Serverless].

  Modelled after the "enricher" pattern where an event is received from a source SNS topic and a corresponding enrichment is published to a destination SNS topic.
  For fault tolerance,
  a message queue is employed between the source topic and the Lambda function,
  and unprocessed events are sent to a dead-letter queue for manual triage.

- `lambda-sqs-worker-cdk`

  An asynchronous [worker] built on [AWS Lambda] and deployed with [AWS CDK].

  ```text
  SNS -> SQS (with a dead-letter queue) -> Lambda
  ```

  Comes with configuration validation and infrastructure snapshot testing.

- `oss-npm-package`

  A public npm package published via [semantic-release] pipeline.

  This is intended for [seek-oss] projects.

- `private-npm-package`

  A private npm package published via [semantic-release] pipeline.

  This is intended for [SEEK-Jobs] projects under the `@seek` npm org.

- `github →` (experimental)

  BYO starter repo!

  **skuba** will shallow-clone your repo and apply some of its base configuration.
  You may need to run `skuba configure` after initialisation to fix up inconsistencies.

[aws lambda]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/technology.html#lambda
[koa]: https://koajs.com/
[resource api]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/components.html#resource-api
[seek-jobs]: https://github.com/orgs/seek-jobs/sso
[seek-oss]: https://github.com/seek-oss
[semantic-release]: https://github.com/semantic-release/semantic-release/
[serverless]: https://serverless.com/
[worker]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/components.html#worker
[express]: https://expressjs.com/
[aws cdk]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/technology.html#cdk

This script is interactive by default.
For unattended execution, pipe in JSON:

```shell
skuba init << EOF
{
  "destinationDir": "tmp-greeter",
  "templateComplete": true,
  "templateData": {
    "ownerName": "my-org/my-team",
    "prodBuildkiteQueueName": "my-team-prod:cicd",
    "repoName": "tmp-greeter"
  },
  "templateName": "greeter"
}
EOF
```

If you are looking to bootstrap an existing project,
see [`skuba configure`].

### `skuba lint`

Check for code quality issues.

This script should be run in CI to verify that [`skuba format`] was applied and triaged locally.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

### `skuba node`

Run a TypeScript source file, or open a REPL if none is provided:

- `skuba node src/some-cli-script.ts`
- `skuba node`

This automatically registers a `src` module alias for ease of local development.
If you use this alias in your production code,
your production entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory
import 'skuba-dive/register';

// You can use the `src` module alias after registration
import { rootLogger } 'src/framework/logging';
```

> **Note:** if you're using the [experimental Babel toolchain],
> you'll be limited to the fairly primitive `babel-node` REPL.
> While it can import TypeScript modules,
> it does not support interactive TypeScript nor modern JavaScript syntax:
>
> ```typescript
> import { someExport } from 'src/someModule';
> // Thrown: [...] Modules aren't supported in the REPL
>
> const { someExport } = require('src/someModule');
> // Thrown: [...] Only `var` variables are supported in the REPL
>
> var { someExport } = require('src/someModule');
> // undefined
>
> var v: undefined;
> // Thrown: [...] Unexpected token
> ```

[`skuba-dive/register`]: https://github.com/seek-oss/skuba-dive#register
[experimental babel toolchain]: ./docs/babel.md

### `skuba start`

Start a live-reloading server for local development.

The entry point is chosen from:

1. Command line argument: `skuba start src/app.ts`
1. Manifest configuration: `package.json#/skuba/entryPoint`
1. Default: `src/app.ts`

The `--inspect` and `--inspect-brk` [Node.js options] are supported for debugging sessions.
For example, in Visual Studio Code:

1. Run `skuba start --inspect-brk`
1. Run the built-in `Node.js: Attach` launch configuration

This automatically registers a `src` module alias for ease of local development.
If you use this alias in your production code,
your production entry point(s) will need to import a runtime module alias resolver like [`skuba-dive/register`].
For example, your `src/app.ts` may look like:

```typescript
// This must be imported directly within the `src` directory
import 'skuba-dive/register';

// You can use the `src` module alias after registration
import { rootLogger } 'src/framework/logging';
```

[node.js options]: https://nodejs.org/en/docs/guides/debugging-getting-started/#command-line-options

#### Start an executable script

Your entry point can be a simple module that runs on load:

```typescript
console.log('Hello world!');
```

#### Start a Lambda function handler

Your entry point can target an exported function:

```bash
skuba start --port 12345 src/app.ts#handler
```

```typescript
export const handler = async (event: unknown, ctx: unknown) => {
  // ...

  return;
};
```

This starts up a local HTTP server that you can POST arguments to:

```bash
curl --data '["event", {"awsRequestId": "123"}]' --include localhost:12345
```

#### Start an HTTP server

Your entry point should export:

```typescript
interface Export {
  // one of these is required
  callback?: () => http.RequestListener;
  requestListener?: http.RequestListener;

  // optional; falls back to an available port
  port?: number;
}
```

Koa should work with minimal fuss:

```typescript
const app = new Koa();

// you can also use `export =` syntax as required by koa-cluster
export default Object.assign(app, { port });
```

As does Express:

```typescript
const app = express();

export default Object.assign(app, { port });
```

### `skuba test`

Run tests with Jest.

Arguments are passed through to the Jest CLI.

### `skuba version`

```shell
skuba version
skuba -v
skuba --version
```

Echoes the installed version of **skuba**.

## Development API reference

**skuba** should be a `devDependency` that is excluded from your production bundle.

Its Node.js API can be used in build and test code.

### `Jest.mergePreset`

Merge additional Jest options into the **skuba** preset.

This concatenates array options like `testPathIgnorePatterns`.

```js
// jest.config.ts

import { Jest } from 'skuba';

export default Jest.mergePreset({
  coveragePathIgnorePatterns: ['src/testing'],
  setupFiles: ['<rootDir>/jest.setup.ts'],

  // this is concatenated to the end of the built-in patterns
  testPathIgnorePatterns: ['/test\\.ts'],
});
```

### `Net.waitFor`

Wait for a resource to start listening on a socket address.

This can be used to wait for a Docker container to start listening on its port,
as described in <https://docs.docker.com/compose/startup-order/>.

```js
// jest.config.int.js

const rootConfig = require('./jest.config');

module.exports = {
  ...rootConfig,
  globalSetup: '<rootDir>/jest.setup.int.ts',
};
```

```typescript
// jest.setup.int.ts

import { Net } from 'skuba';

module.exports = () =>
  Net.waitFor({
    host: 'composeService',
    port: 5432,
    resolveCompose: Boolean(process.env.LOCAL),
  });
```

## Runtime API reference

<https://github.com/seek-oss/skuba-dive#api-reference>

**skuba-dive** is an optional runtime component for **skuba**.

**skuba-dive** should be a `dependency` that is included in your production bundle.

## Design

### Goals

#### Speed up prototyping and project creation

#### Standardise tooling

**skuba** tracks technology recommendations from [SEEK's Technology Strategy].

#### Reduce maintenance overhead

**skuba** bundles developer tooling into one `package.json#/devDependency`.

This tooling is managed and upgraded for you.
Upgrades are consolidated into one Renovate PR.

### Non-goals

#### Support for vanilla JavaScript

TypeScript is proposed as the default language of SEEK.

**skuba** prescribes TypeScript-focused tooling.

#### One stencil to rule them all

**skuba** may advocate for certain approaches and technologies through its templates,
but this shouldn't be taken as the only way you can write code.

You can continue to base codebases on your own starters and stencils.

#### One library to rule them all

**skuba** distributes a minimal runtime component through the **skuba-dive** package.
It has no aspirations of becoming a monolithic Node.js runtime library.

SEEK's developer community maintains an assortment of targeted packages.

Here are some highlights:

| Package                        | Description                                            |
| :----------------------------- | :----------------------------------------------------- |
| [@seek/logger]                 | Write application logs in a standardised format        |
| [seek-datadog-custom-metrics]  | Write Datadog metrics in [Gantry] and Lambda           |
| [seek-koala]                   | Add SEEK-standard observability to Koa servers         |
| 🔒 [@seek/db-client]           | Connect to databases with credential (rotation) smarts |
| 🔒 [@seek/graphql-utils]       | Add observability to GraphQL servers                   |
| 🔒 [@seek/node-s2sauth-issuer] | Call an [s2sauth]-protected service                    |
| 🔒 [@seek/typegen]             | Generate TypeScript types from a JSON schema           |
| 🔒 [@seek/zactive-directory]   | Authenticate and authorise [SSOd] users                |

[@seek/db-client]: https://github.com/SEEK-Jobs/db-client
[@seek/graphql-utils]: https://github.com/SEEK-Jobs/graphql-utils
[@seek/logger]: https://github.com/seek-oss/logger
[@seek/node-authentication]: https://github.com/SEEK-Jobs/node-authentication
[@seek/node-s2sauth-issuer]: https://github.com/SEEK-Jobs/node-s2sauth-issuer
[@seek/typegen]: https://github.com/SEEK-Jobs/typegen
[@seek/zactive-directory]: https://github.com/SEEK-Jobs/zactive-directory
[gantry]: https://gantry.ssod.skinfra.xyz
[seek-datadog-custom-metrics]: https://github.com/seek-oss/datadog-custom-metrics
[seek-koala]: https://github.com/seek-oss/koala
[s2sauth]: https://github.com/SEEK-Jobs/s2sauth
[ssod]: https://github.com/SEEK-Jobs/seek-ssod-ingress
