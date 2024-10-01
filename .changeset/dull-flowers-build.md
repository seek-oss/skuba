---
'skuba': minor
---

format, lint: Point Docker base images to AWS ECR Public and remove constant `--platform` arguments

This updates references to `node:` or `python:` Docker images in your Dockerfiles and `docker-compose.yml` files to point to AWS ECR Public to avoid Docker Hub rate limiting. It also removes [constant `--platform` arguments](https://docs.docker.com/reference/build-checks/from-platform-flag-const-disallowed/) from Dockerfiles.

```diff
- FROM --platform=arm64 node:20-alpine AS dev-deps
+ FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps
```

Your Dockerfiles may not be set up to build multi-platform images, so keep in mind that building them locally on an Intel x86 laptop may not yield images that can execute on AWS Graviton instances.
