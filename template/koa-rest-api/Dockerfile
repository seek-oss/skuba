ARG BASE_IMAGE

###

FROM ${BASE_IMAGE} AS build

COPY . .

RUN pnpm install --offline
RUN pnpm build
RUN pnpm install --offline --prod

###

FROM gcr.io/distroless/nodejs22-debian12 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules

ENV NODE_ENV=production

# https://nodejs.org/api/cli.html#cli_node_options_options
ENV NODE_OPTIONS=--enable-source-maps

ARG PORT=8001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["--require", "./lib/tracing.js", "./lib/listen.js"]
