---
'skuba': patch
---

template: Remove `BUILDPLATFORM` from Dockerfiles

Previously, the built-in templates made use of [`BUILDPLATFORM`](https://docs.docker.com/build/guide/multi-platform/#platform-build-arguments) and a fallback value:

```dockerfile
FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs20-debian11
```

1. Choose the platform of the host machine running the Docker build. A vCurrent SEEK build agent or Apple Silicon laptop will build under `arm64`, while an Intel laptop will build under `amd64`.
2. Fall back to `arm64` if the build platform is not available. This maintains compatibility with toolchains like Gantry that lack support for the `BUILDPLATFORM` argument.

This approach allowed you to quickly build images and run containers in a local environment without emulation. For example, you could `docker build` an `arm64` image on an Apple Silicon laptop for local troubleshooting, while your CI/CD solution employed `amd64` hardware across its build and runtime environments. The catch is that your local `arm64` image may exhibit different behaviour, and is unsuitable for use in your `amd64` runtime environment without cross-compilation.

The built-in templates now hardcode `--platform` as we have largely converged on `arm64` across local, build and runtime environments:

```dockerfile
FROM --platform=arm64 gcr.io/distroless/nodejs20-debian11
```

This approach is more explicit and predictable, reducing surprises when working across different environments and toolchains. Building an image on a different platform will be slower and rely on emulation.
