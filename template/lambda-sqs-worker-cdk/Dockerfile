# syntax=docker/dockerfile:1.6

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:20-alpine AS dev-deps

# Needed for cdk
RUN apk add --no-cache bash

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN \
  --mount=type=secret,id=npm,dst=/root/.npmrc \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  yarn package && \
  yarn cache clean
