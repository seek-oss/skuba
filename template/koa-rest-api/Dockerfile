# Docker image history includes ARG values, so never target this stage directly
FROM node:12-alpine AS unsafe-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

ARG NPM_READ_TOKEN

RUN \
  echo '//registry.npmjs.org/:_authToken=${NPM_READ_TOKEN}' > .npmrc && \
  NPM_READ_TOKEN="${NPM_READ_TOKEN}" yarn install --frozen-lockfile --ignore-optional --non-interactive --production && \
  rm .npmrc

###

# Docker image history includes ARG values, so never target this stage directly
FROM unsafe-deps AS unsafe-dev-deps

ARG NPM_READ_TOKEN

RUN \
  echo '//registry.npmjs.org/:_authToken=${NPM_READ_TOKEN}' > .npmrc && \
  NPM_READ_TOKEN="${NPM_READ_TOKEN}" yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  rm .npmrc

FROM node:12-alpine AS build

WORKDIR /workdir

COPY --from=unsafe-dev-deps /workdir .

COPY . .

RUN yarn build

###

FROM node:12-alpine AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib

COPY --from=unsafe-deps /workdir/node_modules node_modules

ENV NODE_ENV production

ARG PORT=8001
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD npx --no-install koa-cluster lib/app
