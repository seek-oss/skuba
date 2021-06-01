# Docker image history includes ARG values, so never target this stage directly
FROM node:14-alpine AS unsafe-dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

ARG NPM_READ_TOKEN

RUN yarn config set cache-folder /yarn

RUN \
  echo '//registry.npmjs.org/:_authToken=${NPM_READ_TOKEN}' > .npmrc && \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  rm .npmrc

###

FROM node:14-alpine AS dev-deps

WORKDIR /workdir

COPY --from=unsafe-dev-deps /workdir .

COPY --from=unsafe-dev-deps /yarn /yarn

RUN yarn config set cache-folder /yarn

###

FROM dev-deps AS build

COPY . .

RUN yarn build
