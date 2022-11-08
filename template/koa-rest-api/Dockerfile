ARG BASE_IMAGE
ARG BASE_TAG

###

FROM ${BASE_IMAGE}:${BASE_TAG} AS deps

RUN yarn install --ignore-optional --ignore-scripts --non-interactive --offline --production

###

FROM ${BASE_IMAGE}:${BASE_TAG} AS build

COPY . .

RUN yarn build

###

FROM --platform=${BUILDPLATFORM:-arm64} gcr.io/distroless/nodejs:18 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib

COPY --from=deps /workdir/node_modules node_modules

ENV NODE_ENV=production

# https://nodejs.org/api/cli.html#cli_node_options_options
ENV NODE_OPTIONS=--enable-source-maps

ARG PORT=8001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["--require", "./lib/tracing.js", "./lib/listen.js"]
