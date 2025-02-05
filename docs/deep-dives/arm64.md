---
parent: Deep dives
---

# ARM64

---

**skuba** templates are configured to be built and run on ARM64 hardware in [CI/CD].

This topic provides some context around this decision,
then discusses how you can [get ready for ARM64](#getting-ready-for-arm64) and adopt it across [new](#creating-a-new-project) and [existing](#migrating-an-existing-project) projects.

---

## Background

SEEK traditionally ran its compute workloads on AMD64 (x86-64) hardware,
with Intel as the de facto choice across home and server computing.
Our recommendation has since shifted to ARM64 hardware,
with the proliferation of ARM-based alternatives in local and cloud environments providing access to greater cost efficiency.

On AWS' cloud platform, this means [Graviton-based] instances rather than Intel-based or AMD-based ones.

---

## Getting ready for ARM64

If you'd like to build and run your projects on ARM64 hardware,
create a Buildkite cluster with a Graviton-based instance type.
In a `vCurrent` strategy:

<!-- prettier-ignore -->
```diff
  schemaVersion: vCurrent
  clusters:
    - name: cicd # Existing cluster

      instanceType: t3.large
      rootVolumeSize: 8

      # ...
+
+   - name: graviton # New cluster; choose a name you like
+
+     cpuArchitecture: arm64
+     instanceType: t4g.large # Required; g is for Graviton
+     rootVolumeSize: 8 # Optional
+
+     # ...
```

Repeat this process for all accounts and strategies under your remit,
taking care to right-size instances and volumes in the process.
If the existing cluster is already optimised,
simply map `instanceType` to the Graviton equivalent and reuse `rootVolumeSize`.

This approach allows you to gradually migrate existing projects over to the new clusters,
then delete the original clusters once complete:

```diff
  schemaVersion: vCurrent
  clusters:
-   - name: cicd
-
-     instanceType: t3.large
-     rootVolumeSize: 8
-
-     # ...
-
    - name: graviton

      cpuArchitecture: arm64
      instanceType: t4g.large
      rootVolumeSize: 8

      # ...
```

See our internal [Buildkite Docs] and [Gantry ARM reference] for more information.

---

## Creating a new project

### Defaulting to ARM64

Let's start by following the [`skuba init`] documentation:

```shell
skuba init
```

and reaching the starter questions:

```shell
? For starters, some project details:
⊙          Owner : SEEK-Jobs/my-team
⊙           Repo : my-repo
⊙       Platform : arm64
⊙ Default Branch : main

# ...
```

Note that new projects default to the `arm64` platform;
leave this as is.

Continue to follow the prompts.
Your Buildkite pipeline should point to the new cluster(s) configured [above](#getting-ready-for-arm64).
After initialising your project,
review the `agents.queue`s in `.buildkite/pipeline.yml`:

```yaml
agents:
  queue: my-prod-account:graviton # Should be the new name you chose above

steps:
  - label: Prod

  - label: Dev
    agents:
      queue: my-dev-account:graviton # Should be the new name you chose above
```

At this point, your new project is ready for ARM64.

### Reverting to AMD64

If you later realise that you are not ready to build and run on ARM64 hardware,
you can revert your project to be compatible with AMD64 hardware.

Point your `agents.queue`s back to the original cluster(s) in `pipeline.yml`:

```diff
  agents:
-   queue: my-prod-account:graviton
+   queue: my-prod-account:cicd

  steps:
    - label: Prod

    - label: Dev
      agents:
-       queue: my-dev-account:graviton
+       queue: my-dev-account:cicd
```

Replace the relevant `--platform` flags in your Dockerfile(s):

```diff
- FROM --platform=arm64 node:20-alpine AS dev-deps
+ FROM --platform=amd64 node:20-alpine AS dev-deps
```

```diff
- FROM --platform=arm64 gcr.io/distroless/nodejs20-debian12 AS runtime
+ FROM --platform=amd64 gcr.io/distroless/nodejs20-debian12 AS runtime
```

For a [Gantry] service,
modify `cpuArchitecture` property on the `ContainerImage` and `Service` resources in `gantry.build.yml` and `gantry.apply.yml`:

<!-- prettier-ignore -->
```diff
  kind: ContainerImage

  schemaVersion: v0.0

- cpuArchitecture: arm64
+ cpuArchitecture: amd64

  ...
```

<!-- prettier-ignore -->
```diff
  kind: Service

  schemaVersion: v0.0

- cpuArchitecture: arm64
+ cpuArchitecture: amd64

  ...
```

For an [AWS CDK] worker,
modify the `architecture` property on the Lambda function resource in `infra/appStack.ts`:

```diff
  const worker = new aws_lambda.Function(this, 'worker', {
-   architecture: aws_lambda.Architecture.ARM_64,
+   architecture: aws_lambda.Architecture.X86_64,
  });
```

For a [Serverless] worker,
modify the `provider.architecture` property in `serverless.yml`:

```diff
  provider:
-   architecture: arm64
+   architecture: x86_64
```

---

## Migrating an existing project

This guide is targeted at existing TypeScript projects that are looking to migrate from AMD64 to ARM64.

In your Buildkite pipeline(s),
point your `agents.queue`s to the new cluster(s) you configured [above](#getting-ready-for-arm64).
Your default pipeline should be defined in [`.buildkite/pipeline.yml`],
though you may have auxiliary pipelines under a similar or nested directory.

```diff
  agents:
-   queue: my-prod-account:cicd
+   queue: my-prod-account:graviton # Should be the new name you chose above

steps:
  - label: Prod

  - label: Dev
    agents:
-     queue: my-dev-account:cicd
+     queue: my-dev-account:graviton # Should be the new name you chose above
```

Set the `--platform=arm64` flag on each external [`FROM`] command in your Dockerfile(s):

```diff
- FROM node:20-alpine AS dev-deps
+ FROM --platform=arm64 node:20-alpine AS dev-deps
```

```diff
- FROM gcr.io/distroless/nodejs20-debian12 AS runtime
+ FROM --platform=arm64 gcr.io/distroless/nodejs20-debian12 AS runtime
```

Review and test the behaviour of your project dependencies that use platform-specific binaries.
Common examples include:

- Browser-adjacent packages like `puppeteer`
- Cryptographic packages like `bcrypt`
- Low-level tooling like `esbuild`

### Gantry

For a [Gantry] service, first locate your Gantry resource files.
As these have no set naming convention, you can look for:

- YAML files that match the following common patterns:

  - `.gantry/**/*.{yaml,yml}`
  - `gantry.{yaml,yml}`
  - `gantry.apply.yml`
  - `gantry.build.yml`
  - `service.{yaml,yml}`

- `file`s supplied to the Gantry plugin in your Buildkite pipeline:

  ```yaml
  steps:
    - label: 📦 Build & Package
      plugins:
        - *aws-sm
        - *private-npm
        - *docker-ecr-cache
        - seek-jobs/gantry#v4.0.0:
            command: build
            file: gantry.build.yml # <-- here
            region: ap-southeast-2
            values: .gantry/common.yml
  ```

Once you have located these files,
set the `cpuArchitecture` property on the `ContainerImage` and `Service` resources:

<!-- prettier-ignore -->
```diff
  kind: ContainerImage

  schemaVersion: v0.0

+ cpuArchitecture: arm64

  ...
```

<!-- prettier-ignore -->
```diff
  kind: Service

  schemaVersion: v0.0

+ cpuArchitecture: arm64

  ...
```

### AWS CDK

For an [AWS CDK] worker, first locate your application stack.
This is a TypeScript source file that may be named similar to `infra/appStack.ts` and contains a class that extends `Stack`:

```typescript
export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    // ...
  }
}
```

Once you have located this file,
set the `architecture` property on the Lambda function resource:

```diff
  const worker = new aws_lambda.Function(this, 'worker', {
+   architecture: aws_lambda.Architecture.ARM_64,
    runtime: aws_lambda.Runtime.NODEJS_20_X,
    // ...
  });
```

```diff
  const worker = new aws_lambda_nodejs.NodejsFunction(this, 'worker', {
+   architecture: aws_lambda.Architecture.ARM_64,
    runtime: aws_lambda.Runtime.NODEJS_20_X,
    // ...
  });
```

### Serverless

For a [Serverless] worker, set the `provider.architecture` property in [`serverless.yml`]:

<!-- prettier-ignore -->
```diff
  provider:
    name: aws

+   architecture: arm64
    runtime: nodejs20.x

    ...
```

[`.buildkite/pipeline.yml`]: https://buildkite.com/docs/pipelines/defining-steps#customizing-the-pipeline-upload-path
[`FROM`]: https://docs.docker.com/reference/dockerfile/#from
[`serverless.yml`]: https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml
[`skuba init`]: ../cli/init.md#interactive-walkthrough
[AWS CDK]: https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html
[Buildkite Docs]: https://backstage.myseek.xyz/docs/default/component/buildkite-docs
[CI/CD]: ./buildkite.md
[Gantry ARM reference]: https://backstage.myseek.xyz/docs/default/component/gantry/v1/reference/using-arm/
[gantry]: https://backstage.myseek.xyz/docs/default/component/gantry/
[Graviton-based]: https://aws.amazon.com/ec2/graviton/
[Serverless]: https://serverless.com/
