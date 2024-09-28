---
'skuba': minor
---

lint: Update Docker base images to point to AWS ECR Public and remove redundant `--platform` usage

This updates references to `node:` or `python:` Docker images in your `Dockerfile` and `docker-compose.yml` files to point to AWS ECR Public to avoid Docker Hub rate limiting, along with removing redundant `--platform` [usage](https://docs.docker.com/reference/build-checks/from-platform-flag-const-disallowed/).

eg.

```Dockerfile
## Before
FROM --platform=arm64 node:20-alpine AS dev-deps

## After
FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps
```
