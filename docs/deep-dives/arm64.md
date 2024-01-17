---
parent: Deep dives
---

# ARM64

---

**skuba** templates are configured to be built and run on ARM64 hardware in [CI/CD].

This topic provides some context around this decision,
and discusses how you can [get ready for ARM64](#getting-ready-for-arm64) or [revert to AMD64](#reverting-to-amd64).

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
specify a Buildkite cluster with a Graviton-based instance type.
This is now the default for `vCurrent` strategies:

```yaml
schemaVersion: vCurrent
clusters:
  - # Take care to right-size instances and disk size
    instanceType: t4g.large # Optional; g is for Graviton
    rootVolumeSize: 8 # Optional
```

See [Builds at SEEK] and the [Gantry ARM reference] for more information.

---

## Reverting to AMD64

If you are not ready to build and run your projects on ARM64 hardware,
you can downgrade a templated project to be compatible with AMD64 hardware.

Replace the relevant `--platform` values in your Dockerfile(s),
then ensure that you run your builds on AMD64 hardware:

```diff
- FROM --platform=arm64 gcr.io/distroless/nodejs20-debian12 AS runtime
+ FROM --platform=${BUILDPLATFORM:-amd64} gcr.io/distroless/nodejs20-debian12 AS runtime

- FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs20-debian12 AS runtime
+ FROM --platform=${BUILDPLATFORM:-amd64} gcr.io/distroless/nodejs20-debian12 AS runtime
```

For a [Gantry] service, modify the `cpuArchitecture` property in your `gantry.build.yml` and `gantry.apply.yml` resource files:

```diff
- cpuArchitecture: arm64
+ cpuArchitecture: amd64
```

For an [AWS CDK] worker, modify the `architecture` property in your `infra/appStack.ts` file:

```diff
const worker = new aws_lambda.Function(this, 'worker', {
- architecture: aws_lambda.Architecture.ARM_64,
+ architecture: aws_lambda.Architecture.X86_64,
});
```

For a [Serverless] worker, modify the `provider.architecture` property in your `serverless.yml` file:

```diff
provider:
- architecture: arm64
+ architecture: x86_64
```

[aws cdk]: https://docs.aws.amazon.com/cdk/latest/guide/work-with-cdk-typescript.html
[builds at seek]: https://backstage.myseek.xyz/docs/default/component/builds-cicd-seek/
[ci/cd]: ./buildkite.md
[gantry]: https://backstage.myseek.xyz/docs/default/component/gantry/
[gantry arm reference]: https://backstage.myseek.xyz/docs/default/component/gantry/v1/reference/using-arm/
[graviton-based]: https://aws.amazon.com/ec2/graviton/
[serverless]: https://serverless.com/
