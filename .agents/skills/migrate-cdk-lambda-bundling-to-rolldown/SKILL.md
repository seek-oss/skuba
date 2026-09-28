---
name: migrate-cdk-lambda-bundling-to-rolldown

description: >-
  Migrates an AWS CDK Lambda worker off aws-cdk-lib's esbuild-bundling
  `aws_lambda_nodejs.NodejsFunction` construct onto a plain
  `aws_lambda.Function` backed by a pre-built bundle from the
  `Rolldown.lambdaAsset` plugin. Use when a CDK stack imports `NodejsFunction`
  from `aws-cdk-lib/aws-lambda-nodejs`, or when asked to migrate/replace CDK
  Lambda bundling with rolldown.
disable-model-invocation: true
---

# Migrate `aws_lambda_nodejs.NodejsFunction` to `Rolldown.lambdaAsset`

## Why

`aws_lambda_nodejs.NodejsFunction` bundles the handler with esbuild during
`cdk synth`, coupling bundling to every deploy and CDK unit test run.
`Rolldown.lambdaAsset` decouples the two: a rolldown build step produces a
plain output directory ahead of time, and CDK just points
`aws_lambda.Function` at it with `aws_lambda.Code.fromAsset`.

Full plugin reference: [`docs/development-api/rolldown.md`](../../development-api/rolldown.md).

A project can have zero, one, or several worker functions, each with its own
`NodejsFunction` and `bundling` block — repeat steps 1–2 per distinct
entry/bundling pair.

A full migration typically touches: a new rolldown config, the CDK stack
(step 2), the stack test (step 4), `package.json` scripts (step 3), and
`.gitignore` (step 3).

## Steps

Work through these in order — each one builds on the last.

### 1. Create the rolldown config

Create a rolldown config from the construct's `entry` and `bundling` props.
Give it an `input`, an output directory, and a `Rolldown.lambdaAsset` plugin
call. Move `bundling.nodeModules` into `lambdaAsset({ nodeModules })`, and
move any `commandHooks.afterBundling` file copies into `assets`.

```diff
+// rolldown.config.mts
+import { defineConfig } from 'rolldown';
+import { Rolldown } from 'skuba';
+
+const externalModules = [/* same packages as the old bundling.externalModules, if any */];
+const nodeModules = [/* same packages as the old bundling.nodeModules */];
+
+export default defineConfig({
+  platform: 'node',
+  input: { index: 'src/app.ts' }, // same entry point as the old `entry`
+  external: [...externalModules, ...nodeModules],
+  output: {
+    dir: 'dist/worker', // any output directory; referenced again in step 2
+    sourcemap: true, // same intent as the old bundling.sourceMap
+  },
+  plugins: [
+    Rolldown.lambdaAsset({
+      nodeModules,
+      assets: [
+        // one entry per `afterBundling` copy command, e.g.:
+        { from: 'src/some-file-your-handler-reads-at-runtime.json' },
+      ],
+    }),
+  ],
+});
```

| Old `bundling` prop (esbuild)              | New rolldown equivalent                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `externalModules`                          | `external` (merge into whatever else `external` already lists)                                                                                         |
| `nodeModules`                              | `Rolldown.lambdaAsset({ nodeModules })`, and also merged into `external`                                                                               |
| `commandHooks.afterBundling` (file copies) | `Rolldown.lambdaAsset({ assets })`                                                                                                                     |
| `sourceMap`                                | `output.sourcemap`                                                                                                                                     |
| `minify`                                   | `output.minify`                                                                                                                                        |
| `define`                                   | `define`                                                                                                                                               |
| `target`                                   | `output.target` (esbuild and rolldown use different target strings — check [rolldown's reference](https://rolldown.rs/reference/OutputOptions.target)) |

Other esbuild-specific options (`esbuildArgs`, `loader`, `tsconfig`,
`forceDockerBundling`, ...) don't have a direct rolldown equivalent — check
whether the project still needs them; most don't apply once bundling moves
out of CDK's Docker-based esbuild pipeline.

`nodeModules` must also appear in `external` — merged alongside whatever was
already there, never replacing it — so the plugin installs those packages
instead of also bundling them.

### 2. Rework the Lambda construct in the CDK stack (e.g. `infra/appStack.ts`)

Drop the `NodejsFunction` import from `aws-cdk-lib/aws-lambda-nodejs`, and
replace the construct with `aws_lambda.Function` pointed at the build output
from step 1.

```diff
+import * as path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
 import { ... } from 'aws-cdk-lib';
-import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

 // ...

-const worker = new NodejsFunction(this, 'worker', {
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
  whether CDK is invoked from the package root or elsewhere. This is a
  separate concern from the rolldown build's own working directory — see
  step 3.
- `handler` is `<chunk name>.<exported function name>` — `input: { index: 'src/app.ts' }`
  plus an exported `handler` gives a chunk named `index` and a handler string
  of `'index.handler'`.
- Every other `lambda.FunctionOptions` prop (`environment`, `memorySize`,
  `architecture`, `layers`, ...) carries over unchanged — `NodejsFunction`
  accepts the same shape as `aws_lambda.Function`.

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

**This build step is working-directory sensitive.** Unlike `Code.fromAsset`
in step 2 — which resolves against the compiled stack file's own path —
rolldown's `input`, `output.dir`, and `Rolldown.lambdaAsset`'s `assets[].from`
all resolve relative to the process's current working directory by default
(`projectRoot` only changes where `nodeModules`/`assets` are resolved from,
not `input`/`output.dir`). Run `build:worker` from the package directory —
`pnpm --filter` and `pnpm -C <package>` both do this correctly — or use
absolute paths derived from the config file's own location if the build
might run from elsewhere. See the [Workspaces](../../development-api/rolldown.md#workspaces)
section for the monorepo case.

Add the built output directory (`dist/worker` in this example) to
`.gitignore`; the plugin always overwrites its `package.json`, so treat it
as build output.

### 4. Fix the CDK stack test

CDK synth in the unit test also needs the asset directory to exist. If the
project's snapshot normalises away the asset hash (e.g. via
[`Cdk.normaliseTemplate`](../../development-api/cdk.md#normalisetemplate)),
a placeholder bundle is enough to satisfy synth without the assertion caring
about its contents — **verify this is actually true for the project first**;
if the snapshot does hash the asset, build the real bundle before running
tests instead of stubbing a placeholder.

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
+      path.join(assetDir, 'index.js'),
+      'export const handler = () => {};\n',
+    );
+  }
+});
```

This only fills in a _missing_ directory — it never touches one that already
exists, so it can't tell a real, freshly built bundle apart from a stale one
left over from a previous run. Prefer building the real bundle
(`pnpm build:worker`) before running tests in CI; treat this placeholder as a
local-development convenience only, and delete `dist/worker` if a test
passes unexpectedly after changing the entry point or `output.dir`.

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

- Replacing `external` outright (instead of appending `nodeModules` to it)
  silently bundles anything that was external for other reasons — it still
  builds, but fails at runtime or ships a bloated bundle.
- Forgetting step 4 fails CDK stack tests with a missing-asset-directory error
  on `Template.fromStack`, even though production deploys build first.
- Running `build:worker` from the wrong working directory (e.g. the
  workspace root instead of the package) silently resolves `input`,
  `output.dir`, or `assets[].from` against the wrong base path — it may
  still "succeed" by writing to an unexpected location rather than erroring.
- A `handler` that doesn't match the entry chunk's name fails at Lambda
  invoke time, not at synth or deploy time.
- Any `nodeModules` package must appear in both `external` and
  `lambdaAsset({ nodeModules })` — bundled-and-installed or
  neither-bundled-nor-installed both break at runtime.
