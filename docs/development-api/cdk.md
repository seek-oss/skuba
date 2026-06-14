---
parent: Development API
---

# Cdk

---

## normaliseTemplate

Produces stable snapshots of CDK stack templates by stripping volatile, environment-specific values.
This is particularly useful when testing to avoid snapshot churn on inconsequential differences in the generated templates.

```typescript
import { Template } from 'aws-cdk-lib/assertions';
import { Cdk } from 'skuba';

test('stack', () => {
  // ...

  const template = Template.fromStack(stack);

  const json = Cdk.normaliseTemplate(template.toJSON());

  expect(json).toMatchSnapshot();
});
```

---

## NodejsFunction

A drop-in replacement for [`aws_lambda_nodejs.NodejsFunction`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html) that bundles your Lambda handler with [rolldown](https://rolldown.rs) instead of the built-in esbuild pipeline.
The built-in CDK construct hardcodes esbuild; this construct gives you full control over the bundler and its configuration while keeping the same construct API.

### Prerequisites

`NodejsFunction` declares `aws-cdk-lib`, `constructs`, and `rolldown` as **optional** peer dependencies so the rest of `skuba` stays usable without them.
These are loaded lazily, only when you access `Cdk.NodejsFunction`, so importing `Cdk` for other utilities does not require them.
Install them where you use the construct:

```shell
pnpm add -D aws-cdk-lib constructs rolldown
```

- `aws-cdk-lib >= 2.130.0`, `constructs ^10.0.0`, `rolldown >= 1.0.0`
- Node.js >= 22.14.0

### Quick start

#### 1. Write a rolldown config

The config must export a default [rolldown configuration object](https://rolldown.rs/reference/config-options).
The construct merges in the entry point and output directory at synthesis time, so you do not need to set `input`, `output.dir`, or `output.entryFileNames` for the Lambda build.

```js
// rolldown.lambda.config.mjs
export default {
  output: {
    format: 'cjs',
  },
  external: [/^node:/],
};
```

#### 2. Declare `NodejsFunction` in your stack

```ts
import { Cdk } from 'skuba';
import { Stack, type StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import type { Construct } from 'constructs';

export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new Cdk.NodejsFunction(this, 'worker', {
      entry: 'src/worker.ts', // handler entry file
      runtime: lambda.Runtime.NODEJS_24_X,
      bundling: {
        bundlerConfig: 'rolldown.lambda.config.mjs',
      },
    });
  }
}
```

#### 3. Synthesise

```shell
cdk synth
# or
cdk deploy
```

CDK invokes rolldown during synthesis. The bundled output is written to the CDK asset staging directory and uploaded to S3. All bundling is local; Docker is never used.

### How it works

When CDK synthesises your stack, the construct:

1. Reads the config file at `bundlerConfig` (must export a default object).
2. Merges in the CDK-controlled entry point and output directory.
3. Spawns a bridge script with `node` that calls rolldown's JavaScript API with the merged config.
4. Installs any `nodeModules` into the asset directory.
5. Zips the output and uploads it as a Lambda asset.

### Props

All [`lambda.FunctionOptions`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.FunctionOptions.html) props (`environment`, `timeout`, `memorySize`, `architecture`, `layers`, ...) are accepted unchanged. In addition:

| Prop               | Required | Description                                                                                                                                                                                                          |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entry`            | Yes      | Path to the handler entry file. Accepts `.ts`, `.js`, `.mjs`, `.mts`, `.cts`, `.cjs`. Relative paths resolve from `process.cwd()`.                                                                                   |
| `bundling`         | Yes      | Bundling configuration (see below).                                                                                                                                                                                  |
| `handler`          | No       | Exported handler function name. Default `'handler'`. The bundle is always emitted as `index`, so the Lambda handler is `index.<functionName>`; any file/path prefix is discarded (`myFile.run` becomes `index.run`). |
| `runtime`          | No       | Must be a `NODEJS` family runtime. Default `lambda.Runtime.NODEJS_LATEST`.                                                                                                                                           |
| `depsLockFilePath` | No       | Path to a `pnpm-lock.yaml`. Auto-detected by walking up parent directories when omitted. pnpm is the only supported package manager.                                                                                 |
| `projectRoot`      | No       | Project root; must contain the lock file. Defaults to the parent directory of `depsLockFilePath`.                                                                                                                    |

#### `BundlingOptions`

| Field           | Required | Description                                                                                                                                                                                                                                      |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bundlerConfig` | Yes      | Path to the rolldown config file (absolute or relative to `projectRoot`).                                                                                                                                                                        |
| `nodeModules`   | No       | npm packages to install into the asset directory rather than embed in the bundle. Versions are resolved from your `package.json` / lock file.                                                                                                    |
| `commandHooks`  | No       | `beforeBundling`, `afterBundling`, and `beforeInstall` hooks returning arrays of shell command strings. `beforeInstall` runs only when `nodeModules` is set.                                                                                     |
| `assetHash`     | No       | Custom asset hash. When set, CDK uses `AssetHashType.CUSTOM` instead of hashing the output.                                                                                                                                                      |
| `timeout`       | No       | Maximum time, in milliseconds, any single spawned subprocess (bundler bridge, package-manager install, or command hook) may run before it is killed. Omit for no timeout. This is a synth-time guard, unrelated to the Lambda runtime `timeout`. |
| `ignoreScripts` | No       | When `true`, disables package lifecycle scripts during the `nodeModules` install by writing `ignore-scripts=true` to the staged `.npmrc`. Default `false`.                                                                                       |

The construct throws a `ValidationError` at synth time if `runtime` is not a `NODEJS` family runtime, `entry` has an unsupported extension, no `pnpm-lock.yaml` can be found (and `depsLockFilePath` is not set), or a `packageManager` field declares a package manager other than pnpm. A missing `entry`, `bundlerConfig`, or `depsLockFilePath` file is not pre-validated; it surfaces as a bundler or package-manager error when the bundle runs.

### Output handling

The construct respects **how** your config bundles (format, target, sourcemaps, minification, externals, plugins) but always controls **where the output goes and what the entry file is named**: CDK owns the asset staging directory, and the Lambda handler string is derived from the entry filename, so the two must stay in agreement.

- The output directory is set to CDK's asset staging directory.
- The entry filename is set to `index.js` for CommonJS or `index.mjs` for ESM. For ESM, a `package.json` with `{ "type": "module" }` is also written so secondary chunks load as ES modules.
- Rolldown defaults to **ESM** when `output.format` is omitted. Set `output.format: 'cjs'` if you want CommonJS.
- The handler is always emitted as a single `index.js` / `index.mjs`. Code splitting from dynamic `import()` works; secondary chunks are staged alongside the handler. Config that renames, splits, or removes the entry chunk (`output.preserveModules`, multiple `output` entries, or a custom `output.entryFileNames`) is **rejected at synth with an error** rather than silently deploying a Lambda without a findable handler.

### Externals and `nodeModules`

Packages with native binaries (e.g. `sharp`) usually should not be bundled. Use `nodeModules` to install them into the asset directory instead, and mark them external in your rolldown config so they are not also embedded:

```js
// rolldown.lambda.config.mjs
export default {
  output: { format: 'cjs' },
  external: [/^node:/, 'sharp'],
};
```

```ts
new Cdk.NodejsFunction(this, 'image-processor', {
  entry: 'src/image-processor.ts',
  bundling: {
    bundlerConfig: 'rolldown.lambda.config.mjs',
    nodeModules: ['sharp'],
  },
});
```

After bundling, the construct resolves each `nodeModules` package's version from the nearest `package.json`, writes a minimal `package.json` into the output directory, copies the pnpm workspace config and lock files, and runs `pnpm install`. Install-only config files (including `.npmrc`, which may hold registry credentials) are stripped from the asset afterwards.

### Migrating from `aws_lambda_nodejs.NodejsFunction`

`NodejsFunction` is a structural drop-in for the built-in construct. The differences are:

- `bundling` is required and takes this package's `BundlingOptions` (not `aws_lambda_nodejs.BundlingOptions`).
- There is no `externalModules` option. Use rolldown's native `external` option to keep a package out of the bundle, or `nodeModules` to install it into the Lambda output directory.
- `depsLockFilePath` is auto-detected when unset (same heuristic as the CDK built-in).

All `lambda.FunctionOptions` props (`environment`, `timeout`, `memorySize`, `architecture`, `layers`, ...) work unchanged.

### Security and trust model

Bundling runs **your code with the full privileges of the synth environment** (typically CI, holding cloud credentials). At synth time the construct imports your `bundlerConfig` and executes it, runs any `commandHooks` through the platform shell, and runs a dependency install when `nodeModules` is set. Every spawned subprocess inherits the full `process.env`.

Treat your bundler config, command hooks, and dependency tree as trusted code. To reduce exposure, set `ignoreScripts: true` to disable package lifecycle scripts during the `nodeModules` install, and set `timeout` to bound how long any single subprocess may run.
