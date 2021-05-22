# Docker image history includes ARG values, so never target this stage directly
FROM node:14-alpine AS unsafe-dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

ARG NPM_READ_TOKEN

RUN \
  echo '//registry.npmjs.org/:_authToken=${NPM_READ_TOKEN}' > .npmrc && \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  yarn package && \
  rm .npmrc

###

FROM node:14-alpine AS build

WORKDIR /workdir

COPY --from=unsafe-dev-deps /workdir .
