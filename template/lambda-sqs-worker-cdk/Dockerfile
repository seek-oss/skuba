# syntax=docker/dockerfile:1.14

FROM public.ecr.aws/docker/library/node:22-alpine AS dev-deps

# Needed for cdk
RUN apk add --no-cache bash git

RUN --mount=type=bind,source=package.json,target=package.json \
    corepack enable pnpm && corepack install

RUN --mount=type=bind,source=package.json,target=package.json \
    pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch
