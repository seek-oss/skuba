---
'skuba': patch
---

template: Support AMD64 Docker builds via `BUILDPLATFORM`

See the [Docker documentation](https://docs.docker.com/build/building/multi-platform/#building-multi-platform-images) for more information. Note that this does not allow you to build on AMD64 hardware then deploy to ARM64 hardware and vice versa. It is provided for convenience if you need to revert to an AMD64 workflow and/or build and run an image on local AMD64 hardware.
