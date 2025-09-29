---
'skuba': patch
---

lint: Remove Dockerfile `syntax` parser directive

Our [containerisation guidance](https://seek-oss.github.io/skuba/docs/deep-dives/npm.html) mounts the `NPM_TOKEN` environment variable as a build secret. This requires [Dockerfile frontend version 1.10+](https://docs.docker.com/build/buildkit/dockerfile-release-notes/#1100), and we previously recommended adding a [`syntax` parser directive](https://docs.docker.com/reference/dockerfile/#syntax) to ensure availability of the feature in your build context.

```dockerfile
# syntax=docker/dockerfile:1.10.0

FROM ...
```

However, the directive introduces an online dependency on Docker services at build time. As SEEK-standard local & CI environments now include frontend version 1.18+ in their Docker toolchains, we recommend removing the directive and relying on the bundled version to reduce manual upkeep of the frontend version and to improve resilience.

We will try to apply a one-time [patch](https://seek-oss.github.io/skuba/docs/cli/lint.html#patches) to your project to remove the directive. If your build breaks after the patch, your Dockerfile(s) may use other newer syntax features, and you can try manually restoring the directive.
