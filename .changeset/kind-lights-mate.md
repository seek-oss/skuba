---
'skuba': patch
---

migrate, lint: Add `--import dd-trace/initialize.mjs` to lambda `NODE_OPTIONS` when handler redirection is disabled

When Datadog handler redirection is turned off (`redirectHandler: false` for CDK,
`redirectHandlers: false` for serverless), Datadog no longer auto-wraps the handler so
dd-trace must be initialised explicitly via the ESM loader flag. The ESM migration now
appends `--import dd-trace/initialize.mjs` to the lambda's `NODE_OPTIONS` in this case,
and a new upgrade patch retrofits projects that already migrated.

CDK:

```diff
  const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
    // ...
    environment: {
      // ...
-     NODE_OPTIONS: '--enable-source-maps',
+     NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs',
      // ...
    },
  });

  // ...

  const datadog = new DatadogLambda(this, 'datadog', {
    apiKeySecret: datadogSecret,
    addLayers: false,
    enableDatadogLogs: false,
    flushMetricsToLogs: false,
    extensionLayerVersion: DATADOG_EXTENSION_LAYER_VERSION,
    redirectHandler: false,
  });

datadog.addLambdaFunctions([worker]);
```

Serverless:

```diff
  custom:
    datadog:
      redirectHandlers: false

  provider:
    environment:
-     NODE_OPTIONS: '--enable-source-maps'
+     NODE_OPTIONS: '--enable-source-maps --import dd-trace/initialize.mjs'
```
