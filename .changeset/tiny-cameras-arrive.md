---
'@skuba-lib/api': minor
---

Cdk: Add `NodejsFunction` construct for rolldown-bundled Lambda functions

`Cdk.NodejsFunction` is a drop-in replacement for [`aws_lambda_nodejs.NodejsFunction`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html) that bundles your Lambda handler with [rolldown](https://rolldown.rs) instead of the built-in esbuild pipeline. You keep the familiar CDK construct API while taking full control over the bundler configuration.

It is exposed from the main `skuba` entry point as `Cdk.NodejsFunction` and loaded lazily, so its optional `aws-cdk-lib`, `constructs` and `rolldown` peer dependencies are only required when you access it.

```ts
import { Cdk } from 'skuba';
import * as lambda from 'aws-cdk-lib/aws-lambda';

new Cdk.NodejsFunction(this, 'worker', {
  entry: 'src/worker.ts',
  runtime: lambda.Runtime.NODEJS_24_X,
  bundling: {
    bundlerConfig: 'rolldown.lambda.config.mjs',
  },
});
```

Features:

- `bundlerConfig` points to a config file that exports a default rolldown configuration object; the construct merges in the CDK-controlled entry point and output directory at synthesis time, and emits a single ESM `index.mjs` handler (with a `type: module` `package.json`). Output is ESM only; a CommonJS `output.format` is rejected at synth.
- `nodeModules` installs specified packages into the Lambda asset directory rather than embedding them in the bundle, with version resolution from your `pnpm-lock.yaml`.
- `commandHooks` (`beforeBundling`, `afterBundling`, `beforeInstall`) run shell commands at each stage of the pipeline.
- `timeout` bounds how long any spawned subprocess may run, and `ignoreScripts` disables package lifecycle scripts during the `nodeModules` install.
- All `lambda.FunctionOptions` props (`environment`, `timeout`, `memorySize`, `architecture`, `layers`, etc.) pass through unchanged.

Requires `aws-cdk-lib >= 2.130.0`, `constructs ^10.0.0`, and `rolldown >= 1.0.0`. These are declared as optional peer dependencies, so projects that do not use the construct are unaffected; install `rolldown` as a dev dependency where you do.
