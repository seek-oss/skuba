# syntax=docker/dockerfile:1.6

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN \
  --mount=type=secret,id=npm,dst=/root/.npmrc \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  yarn cache clean
