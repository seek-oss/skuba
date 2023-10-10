# syntax=docker/dockerfile:1.2

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:18-alpine AS dev-deps

RUN apk --no-cache add curl
RUN corepack enable
RUN corepack prepare pnpm@latest --activate
RUN pnpm config set store-dir /workdir/.pnpm-store

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN --mount=type=secret,id=npm,dst=/root/.npmrc pnpm fetch
RUN pnpm install --offline --recursive
