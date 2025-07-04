# syntax=docker/dockerfile:1.17

FROM public.ecr.aws/docker/library/node:22-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \
    corepack enable pnpm && corepack install

RUN --mount=type=bind,source=package.json,target=package.json \
    pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    --mount=type=secret,id=NPM_TOKEN,env=NPM_TOKEN,required=true \
    pnpm fetch
