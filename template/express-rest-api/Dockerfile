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

FROM gcr.io/distroless/nodejs:16 AS runtime

WORKDIR /workdir

COPY --from=build /workdir/lib lib

COPY --from=deps /workdir/node_modules node_modules

ENV NODE_ENV production

ARG PORT=8001
ENV PORT ${PORT}
EXPOSE ${PORT}

CMD ["lib/listen.js"]
