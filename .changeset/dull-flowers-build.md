---
'skuba': minor
---

lint: Update Docker base images to point to AWS ECR Public

This updates references to `node:` or `python:` Docker images in your `Dockerfile` and `docker-compose.yml` files to point to AWS ECR Public to avoid Docker Hub rate limiting

eg.

```Dockerfile
## Before
FROM node:20-alpine AS dev-deps

## After
FROM public.ecr.aws/docker/library/node:20-alpine AS dev-deps
```
