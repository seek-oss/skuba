# syntax=docker/dockerfile:1.6

FROM --platform=<%- platformName %> node:20-alpine AS dev-deps

RUN corepack enable pnpm
RUN pnpm config set store-dir /root/.pnpm-store

WORKDIR /workdir

RUN --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=secret,id=npm,dst=/root/.npmrc,required=true \
    pnpm fetch
