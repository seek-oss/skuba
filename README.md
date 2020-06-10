# 🤿

```text
    ╭─╮     ╭─╮
╭───│ ╰─╭─┬─╮ ╰─╮───╮
│_ ─┤  <│ ╵ │ • │ • │
╰───╰─┴─╰───╯───╯── ╰
```

![GitHub Release](https://github.com/seek-oss/skuba/workflows/Release/badge.svg?branch=master)
![GitHub Validate](https://github.com/seek-oss/skuba/workflows/Validate/badge.svg?branch=master)
[![Node.js version](https://img.shields.io/badge/node-%3E%3D%2012-brightgreen)](https://nodejs.org/en/)
[![npm package](https://img.shields.io/npm/v/skuba)](https://www.npmjs.com/package/skuba)

Toolkit for backend application development on SEEK's gravel and paved roads:

- Write in TypeScript
- Enforce coding standards with ESLint and Prettier
- Test with Jest
- Deploy with [Gantry] / [Serverless]

Related reading:

[sku]: https://github.com/seek-oss/sku
[tech-strategy]: https://tech-strategy.ssod.skinfra.xyz

- [sku] for developing frontend applications
- [tech-strategy]

## Table of contents

- [Getting started](#getting-started)
- [CLI reference](#cli-reference)
- [Development API reference](#development-api-reference)
- [Runtime API reference](#runtime-api-reference)
- [Design](#design)
- [Development](#development)

## Getting started

`skuba` provides you with:

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

## CLI reference

`skuba` commands are typically found in the `scripts` section of `package.json`.

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
  "exclude": ["lib/**/*"]
}
```

Run [`skuba configure`] if you don't have this file.

### `skuba build-package`

Compile the project for compatibility with CommonJS and ES2015 modules.

This is useful for building npm packages, and serves as a replacement for [`smt build`].

[`smt build`]: docs/migrating-from-seek-module-toolkit.md#building

### `skuba configure`

Bootstrap an existing project.

This provides a step-by-step prompt for replacing your config with `skuba`'s.

You should have a clean working tree before running this command,
so it's easy to `git reset` in case you want to restore your original config.

### `skuba format`

Apply automatic fixes to code quality and flag issues that require manual intervention.

This script should be run locally before pushing code to a remote branch.

### `skuba help`

```shell
skuba
skuba help
skuba -h
skuba --help
```

Echoes the available `skuba` commands.

### `skuba init`

Create a new project.

This initialises a new directory and Git repository.

`skuba` supports the following template options:

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

- `github →` (experimental)

  BYO starter repo!

  `skuba` will shallow-clone your repo and apply some of its base configuration.
  You may need to run `skuba configure` after initialisation to fix up inconsistencies.

[aws lambda]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/technology.html#lambda
[koa]: https://koajs.com/
[resource api]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/components.html#resource-api
[serverless]: https://serverless.com/
[worker]: https://tech-strategy.ssod.skinfra.xyz/docs/v1/components.html#worker

This script is interactive by default.
For unattended execution, pipe in JSON:

```shell
skuba init << EOF
{
  "destinationDir": "tmp-greeter",
  "templateComplete": true,
  "templateData": {
    "gitHubTeamName": "@seek-jobs/my-team",
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

### `skuba start`

Start a live-reloading server for local development.

The entry point is chosen from:

1. Command line argument: `skuba start src/app.ts`
1. Manifest configuration: `package.json#/skuba/entryPoint`
1. Default: `src/app.ts`

#### Start an executable script

Your entry point can be a simple module that runs on load:

```typescript
console.log('Hello world!');
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

// port and export syntax are also required for koa-cluster
export = Object.assign(app, { port });
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

Echoes the installed version of `skuba`.

## Development API reference

`skuba` should be a `devDependency` that is excluded from your production bundle.

Its Node.js API can be used in build and test code.

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

`skuba-dive` is an optional runtime component for `skuba`.

`skuba-dive` should be a `dependency` that is included in your production bundle.

## Design

### Goals

#### Speed up prototyping and project creation

#### Standardise tooling

`skuba` tracks technology recommendations from SEEK's [tech-strategy].

#### Reduce maintenance overhead

`skuba` bundles developer tooling into one `package.json#/devDependency`.

This tooling is managed and upgraded for you.
Upgrades are consolidated into one Renovate PR.

### Non-goals

#### Support for vanilla JavaScript

TypeScript is proposed as the default language of SEEK.

`skuba` prescribes TypeScript-focused tooling.

#### One stencil to rule them all

`skuba` may advocate for certain approaches and technologies through its templates,
but this shouldn't be taken as the only way you can write code.

You can continue to base codebases on your own starters and stencils.

#### One library to rule them all

`skuba` distributes a minimal runtime component through the `skuba-dive` package.
It has no aspirations of becoming a monolithic Node.js runtime library.

SEEK's developer community maintains an assortment of targeted packages.

Here are some highlights:

| Package                             | Description                                            |
| :---------------------------------- | :----------------------------------------------------- |
| [@seek/db-client]                   | Connect to databases with credential (rotation) smarts |
| [@seek/graphql-utils]               | Add observability to GraphQL servers                   |
| [@seek/koala]                       | Add SEEK-standard observability to Koa servers         |
| [@seek/logger-js]                   | Write application logs in a standardised format        |
| [@seek/node-authentication]         | Validate SEEK JWTs                                     |
| [@seek/node-datadog-custom-metrics] | Write Datadog metrics in [Gantry] and Lambda           |
| [@seek/node-s2sauth-issuer]         | Call an [s2sauth]-protected service                    |
| [@seek/typegen]                     | Generate TypeScript types from a JSON schema           |
| [@seek/zactive-directory]           | Authenticate and authorise [SSOd] users                |

[@seek/db-client]: https://github.com/SEEK-Jobs/db-client
[@seek/graphql-utils]: https://github.com/SEEK-Jobs/graphql-utils
[@seek/koala]: https://github.com/SEEK-Jobs/koala
[@seek/logger-js]: https://github.com/SEEK-Jobs/logger-js
[@seek/node-authentication]: https://github.com/SEEK-Jobs/node-authentication
[@seek/node-datadog-custom-metrics]: https://github.com/SEEK-Jobs/node-datadog-custom-metrics
[@seek/node-s2sauth-issuer]: https://github.com/SEEK-Jobs/node-s2sauth-issuer
[@seek/typegen]: https://github.com/SEEK-Jobs/typegen
[@seek/zactive-directory]: https://github.com/SEEK-Jobs/zactive-directory
[gantry]: https://github.com/SEEK-Jobs/gantry
[s2sauth]: https://github.com/SEEK-Jobs/s2sauth
[ssod]: https://github.com/SEEK-Jobs/seek-ssod-ingress

## Development

### Prerequisites

- Node.js 12+
- Yarn 1.x

```shell
yarn install
```

### Lint

```shell
# fix
yarn format

# check
yarn lint
```

### Test

```shell
# skuba itself
yarn test

# skuba templates
yarn test:template
```

### Build

```shell
yarn build
```
