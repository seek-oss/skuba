# Worked example

A complete migration, applied to a package that deploys one Lambda worker
(`src/app.ts`) via `infra/appStack.ts`.
It depends on `sharp`, a package with native binaries that must be installed
rather than bundled, and copies a static config file next to the handler —
exercising both `nodeModules` and `assets`. It also already externalises
Node.js built-ins for an unrelated reason, showing that `external` is merged
into rather than replaced.

```diff
diff --git a/.gitignore b/.gitignore
index 1234567..89abcde 100644
--- a/.gitignore
+++ b/.gitignore
@@ -1,3 +1,4 @@
 node_modules/
 cdk.out/
+dist/worker/
diff --git a/infra/appStack.test.ts b/infra/appStack.test.ts
index ab4817e..e8ec51a 100644
--- a/infra/appStack.test.ts
+++ b/infra/appStack.test.ts
@@ -1,10 +1,33 @@
+import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
 import { App, aws_secretsmanager, aws_sns } from 'aws-cdk-lib';
 import { Template } from 'aws-cdk-lib/assertions';
-import { afterAll, afterEach, expect, it, vi } from 'vitest';
+import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';

 const originalEnvironment = process.env.ENVIRONMENT;
 const originalVersion = process.env.VERSION;

+// `aws_lambda.Code.fromAsset` points at the pre-built worker bundle produced by
+// the `build:worker` script. Synth requires the directory to exist, so provide a
+// lightweight placeholder when the real bundle has not been built. The snapshot
+// masks the asset hash, so the contents do not affect the assertion.
+const assetDir = path.join(
+  path.dirname(fileURLToPath(import.meta.url)),
+  '../dist/worker',
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
+
 afterAll(() => {
   process.env.ENVIRONMENT = originalEnvironment;
   process.env.VERSION = originalVersion;
diff --git a/infra/appStack.ts b/infra/appStack.ts
index b3f82fc..3418e1e 100644
--- a/infra/appStack.ts
+++ b/infra/appStack.ts
@@ -1,3 +1,6 @@
+import * as path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
 import { containsSkipDirective } from '@seek/aws-codedeploy-hooks';
 import { LambdaDeployment } from '@seek/aws-codedeploy-infra';
 import {
@@ -15,7 +18,6 @@ import {
 } from 'aws-cdk-lib';
 import type { Construct } from 'constructs';
 import { DatadogLambda } from 'datadog-cdk-constructs-v2';
-import { Cdk } from 'skuba';
 import { Env } from 'skuba-dive';

 import { teams } from '../src/config/teams.js';
@@ -71,26 +73,19 @@ export class AppStack extends Stack {

     const architecture = 'ARM_64';

-    const worker = new Cdk.NodejsFunction(this, 'worker', {
+    const worker = new aws_lambda.Function(this, 'worker', {
       architecture: aws_lambda.Architecture[architecture],
       runtime: aws_lambda.Runtime.NODEJS_24_X,
       memorySize: 512,
       environmentEncryption: kmsKey,
-      entry: './src/app.ts',
+      code: aws_lambda.Code.fromAsset(
+        path.join(
+          path.dirname(fileURLToPath(import.meta.url)),
+          '../dist/worker',
+        ),
+      ),
+      handler: 'index.handler',
       timeout: Duration.seconds(30),
-      bundling: {
-        bundlerConfig: './rolldown.config.mts',
-        nodeModules: ['sharp'],
-        commandHooks: {
-          beforeBundling: () => [],
-          beforeInstall: () => [],
-          // Ship a runtime config file next to the handler.
-          afterBundling: (inputDir: string, outputDir: string) => [
-            `cp ${inputDir}/src/config.json ${outputDir}/config.json`,
-          ],
-        },
-      },
       functionName: `${service}-worker`,
       environment: {
         NODE_ENV: 'production',
diff --git a/package.json b/package.json
index da83310..b679440 100644
--- a/package.json
+++ b/package.json
@@ -10,7 +10,8 @@
     }
   },
   "scripts": {
-    "deploy": "cdk deploy appStack --require-approval never",
+    "build:worker": "rolldown -c rolldown.config.mts",
+    "deploy": "pnpm build:worker && cdk deploy appStack --require-approval never",
     "deploy-role": "scripts/deploy-single-account.sh",
     "format": "skuba format",
     "lint": "skuba lint",
@@ -50,7 +51,7 @@
     "constructs": "10.8.1",
     "datadog-cdk-constructs-v2": "4.2.0",
     "pino-pretty": "13.1.3",
-    "skuba": "16.3.0-add-cdk-NodejsFunction-20260620003026"
+    "skuba": "16.4.0-main-20260928001450"
   },
   "packageManager": "pnpm@10.34.5",
   "engines": {
diff --git a/rolldown.config.mts b/rolldown.config.mts
index 2d5a855..e20bb53 100644
--- a/rolldown.config.mts
+++ b/rolldown.config.mts
@@ -1,13 +1,32 @@
 import { defineConfig } from 'rolldown';
+import { Rolldown } from 'skuba';
+
+const nodeModules = ['sharp'];

 export default defineConfig({
   platform: 'node',
+  input: { index: 'src/app.ts' },
   resolve: {
     mainFields: ['module', 'main'],
     conditionNames: ['@seek/indie-kate/source', 'module'],
   },
-  external: [/^node:/, 'sharp'],
+  external: [/^node:/, ...nodeModules],
   output: {
+    dir: 'dist/worker',
     sourcemap: true,
   },
+  plugins: [
+    Rolldown.lambdaAsset({
+      nodeModules,
+      assets: [
+        // Ship a runtime config file next to the handler.
+        { from: 'src/config.json' },
+      ],
+    }),
+  ],
 });
```
