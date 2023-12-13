# syntax=docker/dockerfile:1.6

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS dev-deps

RUN corepack enable pnpm
RUN pnpm config set store-dir /workdir/.pnpm-store

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN --mount=type=secret,id=npm,dst=/root/.npmrc pnpm fetch
RUN pnpm install --offline --recursive
