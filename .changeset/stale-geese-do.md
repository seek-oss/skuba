---
'skuba': minor
---

lint: Run pnpm codemod to upgrade to pnpm v11

The migration is skipped in projects using `aws-cdk-lib` `NodejsFunction`. The construct writes an empty `pnpm-workspace.yaml` into its bundling output directory before running `pnpm install`, which discards the `allowBuilds` allowlist that pnpm v11 requires. Affected projects stay on pnpm v10; see the [pnpm deep dive](https://seek-oss.github.io/skuba/deep-dives/pnpm.html#lambdas-and-nodejsfunction) for the recommended alternative.

The skuba-managed settings written to `pnpm-workspace.yaml` are now chosen based on the pnpm major version a project pins via `packageManager` or `devEngines.packageManager`, so projects that stay on pnpm v10 keep their v10 settings. Projects that do not pin pnpm are left alone.
