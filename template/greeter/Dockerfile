# syntax=docker/dockerfile:1.9

FROM --platform=<%- platformName %> node:20-alpine AS dev-deps

RUN --mount=type=bind,source=package.json,target=package.json \
    corepack enable pnpm && corepack install

RUN pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=.npmrc,target=.npmrc \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch
