# syntax=docker/dockerfile:1.2

FROM --platform=arm64 node:16-alpine AS dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN \
  --mount=type=secret,id=npm,dst=/workdir/.npmrc \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  yarn cache clean
