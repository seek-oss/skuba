# syntax=docker/dockerfile:1.2

FROM node:16-alpine AS dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN \
  --mount=type=secret,id=npm,dst=/workdir/.npmrc \
  yarn install --frozen-lockfile --ignore-optional --non-interactive

###

FROM dev-deps AS deps

RUN yarn install --ignore-optional --ignore-scripts --non-interactive --offline --production

###

FROM dev-deps AS build

COPY . .

RUN yarn build

###

FROM gcr.io/distroless/nodejs:16 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib

COPY --from=deps /workdir/node_modules node_modules

ENV NODE_ENV production

# https://nodejs.org/api/cli.html#cli_node_options_options
ENV NODE_OPTIONS --enable-source-maps

ARG PORT=8001
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD ["--require", "./lib/tracing.js", "./lib/listen.js"]
