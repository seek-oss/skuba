ARG BASE_IMAGE

###

FROM ${BASE_IMAGE} AS build

COPY . .

RUN pnpm install --offline
RUN pnpm run build
RUN pnpm install --offline --prod

###

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} gcr.io/distroless/nodejs20-debian12 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib
COPY --from=build /workdir/node_modules node_modules

ENV NODE_ENV=production

# https://nodejs.org/api/cli.html#cli_node_options_options
ENV NODE_OPTIONS=--enable-source-maps

ARG PORT=8001
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD ["lib/listen.js"]
