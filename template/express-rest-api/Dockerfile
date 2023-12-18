ARG BASE_IMAGE
ARG BASE_TAG

###

FROM ${BASE_IMAGE}:${BASE_TAG} AS build

COPY . .

RUN pnpm install --offline
RUN pnpm run build
RUN pnpm install --offline --prod

###

FROM --platform=<%- platformName %> gcr.io/distroless/nodejs20-debian11 AS runtime

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
