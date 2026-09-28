---
name: migrate-cdk-nodejs-function-to-rolldown-lambda-asset
description: >-
  Migrates an AWS CDK Lambda worker off skuba's `Cdk.NodejsFunction` esbuild
  construct onto a plain `aws_lambda.Function` backed by a pre-built bundle
  from the `Rolldown.lambdaAsset` plugin. Use when a project imports
  `Cdk.NodejsFunction` or `aws_lambda_nodejs.NodejsFunction` from `skuba` in
  its CDK stack, or when asked to migrate/replace CDK Lambda bundling with
  rolldown.
disable-model-invocation: true
---

# Migrate `Cdk.NodejsFunction` to `Rolldown.lambdaAsset`

## Why

`Cdk.NodejsFunction` bundles the handler with esbuild during `cdk synth`,
coupling bundling to every deploy and CDK unit test run.
`Rolldown.lambdaAsset` decouples the two: a rolldown build step produces a
plain output directory ahead of time, and CDK just points
`aws_lambda.Function` at it with `aws_lambda.Code.fromAsset`.

Full plugin reference: [`docs/development-api/rolldown.md`](../../development-api/rolldown.md).
A complete worked diff is in [`example.md`](./example.md).

## Steps

Work through these in order — each one builds on the last.

### 1. Rework `rolldown.config.mts`

Add `Rolldown.lambdaAsset` and point `output` at a directory instead of a
single file. Move `bundling.nodeModules` into `lambdaAsset({ nodeModules })`,
and move any `commandHooks.afterBundling` file copies into `assets`.

```diff
 import { defineConfig } from 'rolldown';
+import { Rolldown } from 'skuba';
+
+const nodeModules = [/* same packages as the old bundling.nodeModules */];

 export default defineConfig({
   platform: 'node',
+  input: 'src/app.ts', // same entry point as the old `entry`
   resolve: {
     mainFields: ['module', 'main'],
     conditionNames: ['@seek/indie-kate/source', 'module'],
   },
-  external: [/* ... */],
+  external: nodeModules,
   output: {
+    dir: 'dist/worker', // any output directory; referenced again in step 2
+    entryFileNames: 'index.mjs', // chunk name; referenced again in step 2
+    format: 'es',
     sourcemap: true,
   },
+  plugins: [
+    Rolldown.lambdaAsset({
+      nodeModules,
+      assets: [
+        // one entry per `afterBundling` copy command, e.g.:
+        { from: 'src/some-file-your-handler-reads-at-runtime.json' },
+      ],
+    }),
+  ],
 });
```

Keep `external`, `resolve`, and `sourcemap` as they were.
`nodeModules` must list the same packages as before — mark them `external` too
so the plugin installs them instead of also bundling them.

### 2. Rework the Lambda construct in the CDK stack (e.g. `infra/appStack.ts`)

Drop the `Cdk` import, and replace `Cdk.NodejsFunction`/`aws_lambda_nodejs.NodejsFunction`
with `aws_lambda.Function` pointed at the build output from step 1.

```diff
+import * as path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
 import { ... } from 'aws-cdk-lib';
-import { Cdk } from 'skuba';

 // ...

-const worker = new Cdk.NodejsFunction(this, 'worker', {
+const worker = new aws_lambda.Function(this, 'worker', {
   architecture: aws_lambda.Architecture[architecture],
   runtime: aws_lambda.Runtime.NODEJS_24_X,
   memorySize: 512,
   environmentEncryption: kmsKey,
-  entry: './src/app.ts',
+  code: aws_lambda.Code.fromAsset(
+    path.join(path.dirname(fileURLToPath(import.meta.url)), '../dist/worker'),
+  ),
+  handler: 'index.handler',
   timeout: Duration.seconds(30),
-  bundling: { /* ... */ },
   functionName: `${service}-worker`,
   // ... environment, etc. unchanged
 });
```

- `Code.fromAsset` takes the same `output.dir` set in step 1, resolved from the
  compiled stack file's own location (not `process.cwd()`), so the path holds
  whether CDK is invoked from the package root or elsewhere.
- `handler` is `<chunk name>.<exported function name>` —
  `entryFileNames: 'index.mjs'` plus an exported `handler` gives `'index.handler'`.

### 3. Add a build step and wire it into `deploy`

`Code.fromAsset` needs the directory to exist on disk _before_ `cdk synth`
runs, so the rolldown build must happen before every `cdk deploy`.

```diff
   "scripts": {
+    "build:worker": "rolldown -c rolldown.config.mts",
-    "deploy": "cdk deploy appStack --require-approval never",
+    "deploy": "pnpm build:worker && cdk deploy appStack --require-approval never",
```

Call `rolldown` directly here rather than through `skuba build`, unless the
package already builds with `skuba.build: 'rolldown'` — see
[Alongside a tsc or esbuild build](../../development-api/rolldown.md#alongside-a-tsc-or-esbuild-build)
if the package's primary build tool is `tsc` or `esbuild`.

Add the built output directory (`dist/worker` in this example) to `.gitignore`;
the plugin always overwrites its `package.json`, so treat it as build output.

### 4. Fix the CDK stack test

CDK synth in the unit test also needs the asset directory to exist, even
though the actual bundle isn't required — the CDK template snapshot normally
masks the asset hash, so a placeholder is enough as long as the real build
runs before deploys.

```diff
+import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
 import { App, aws_secretsmanager, aws_sns } from 'aws-cdk-lib';
 import { Template } from 'aws-cdk-lib/assertions';
-import { afterAll, afterEach, expect, it, vi } from 'vitest';
+import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

+// Synth requires the asset directory to exist. Provide a placeholder when the
+// real bundle has not been built; the snapshot masks the asset hash.
+const assetDir = path.join(
+  path.dirname(fileURLToPath(import.meta.url)),
+  '../dist/worker', // must match output.dir from step 1
+);
+
+beforeAll(() => {
+  if (!existsSync(assetDir)) {
+    mkdirSync(assetDir, { recursive: true });
+    writeFileSync(
+      path.join(assetDir, 'index.mjs'),
+      'export const handler = () => {};\n',
+    );
+  }
+});
```

### 5. Bump `skuba` and install

Bump `skuba` to a version that ships `Rolldown.lambdaAsset` (16.4.0+), then
`pnpm install`.

## Verify

1. `pnpm build:worker` — produces the asset directory with a real bundle.
2. Run the stack test — confirm the snapshot still matches (re-run with
   `-u` only if the change is expected, e.g. a genuinely new resource).
3. `pnpm deploy` (or `cdk synth`) — confirm synth succeeds now that the asset
   directory exists.

## Gotchas

- Forgetting step 4 fails CDK stack tests with a missing-asset-directory error
  on `Template.fromStack`, even though production deploys build first.
- A `handler` that doesn't match `output.entryFileNames` (or the default chunk
  name when using `input: { name: '...' }`) fails at Lambda invoke time, not
  at synth or deploy time.
- Any `nodeModules` package must appear in both `external` and
  `lambdaAsset({ nodeModules })` — bundled-and-installed or
  neither-bundled-nor-installed both break at runtime.
