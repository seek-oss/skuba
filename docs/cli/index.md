---
nav_order: 2
---

# CLI

**skuba** commands are typically found in the `scripts` section of `package.json`.

They replace direct calls to underlying tooling like `eslint` and `tsc`.

[`skuba configure`]: #skuba-configure
[`skuba format`]: #skuba-format

## `skuba build`

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

## `skuba build-package`

Compile the project for compatibility with CommonJS and ES2015 modules.

This is useful for building npm packages, and serves as a replacement for [`smt build`].

TODO: this is hard
[`smt build`]: ../migration-guides/seek-module-toolkit.md#building

## `skuba configure`

Bootstrap an existing project.

This provides a step-by-step prompt for replacing your config with **skuba**'s.

You should have a clean working tree before running this command,
so it's easy to `git reset` in case you want to restore your original config.

## `skuba format`

Apply automatic fixes to code quality and flag issues that require manual intervention.

This script should be run locally before pushing code to a remote branch.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

## `skuba help`

```shell
skuba
skuba help
skuba -h
skuba --help
```

Echoes the available **skuba** commands.

## `skuba init`

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

## `skuba lint`

Check for code quality issues.

This script should be run in CI to verify that [`skuba format`] was applied and triaged locally.

| Option    | Description                 |
| :-------- | :-------------------------- |
| `--debug` | Enable debug console output |

## `skuba node`

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

[`skuba-dive/register`]: https://github.com/seek-oss/skuba-dive#register

## `skuba start`

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

### Start an executable script

Your entry point can be a simple module that runs on load:

```typescript
console.log('Hello world!');
```

### Start a Lambda function handler

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

### Start an HTTP server

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

## `skuba test`

Run tests with Jest.

Arguments are passed through to the Jest CLI.

## `skuba version`

```shell
skuba version
skuba -v
skuba --version
```

Echoes the installed version of **skuba**.
