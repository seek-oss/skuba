---
'skuba': patch
---

template/lambda-sqs-worker: Declare `dd-trace` dependency

This resolves a `Runtime.ImportModuleError` that occurs if this transitive dependency is not installed:

```console
Runtime.ImportModuleError
Error: Cannot find module 'dd-trace'
```

Alternatively, you can [configure the Datadog Serverless plugin](https://docs.datadoghq.com/serverless/libraries_integrations/plugin/#configuration-parameters) to bundle these dependencies via [Lambda layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html):

```diff
serverless.yml

custom:
  datadog:
-   addLayers: false
+   addLayers: true
```

```diff
package.json

{
  "dependencies": {
-   "datadog-lambda-js: "x.y.z",
-   "dd-trace: "x.y.z"
  },
  "devDependencies": {
+   "datadog-lambda-js: "x.y.z",
+   "dd-trace: "x.y.z"
  }
}
```
