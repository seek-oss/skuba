ARG BASE_IMAGE

FROM BASE_IMAGE as deps

RUN pnpm install --offline --prod
RUN pnpm prune --prod

###

FROM ${BASE_IMAGE} AS build

COPY . .

RUN pnpm install --offline
RUN pnpm build

###

FROM gcr.io/distroless/nodejs24-debian13 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib
COPY --from=build /workdir/package.json package.json
COPY --from=deps /workdir/node_modules node_modules

ENV NODE_ENV=production

# https://nodejs.org/api/cli.html#cli_node_options_options
ENV NODE_OPTIONS=--enable-source-maps

ARG PORT=8001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["--experimental-loader", "@opentelemetry/instrumentation/hook.mjs", "--import", "./lib/tracing.js", "./lib/listen.js"]
