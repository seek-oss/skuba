FROM node:14.16.0-alpine3.11 as builder
ARG NPM_TOKEN
WORKDIR /app
COPY ./ /app
RUN echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > .npmrc
RUN yarn install --frozen-lockfile --non-interactive
RUN rm -f .npmrc

FROM node:14.16.0-alpine3.11
RUN apk update && apk upgrade && \
    apk add --no-cache bash git
WORKDIR /app
COPY --from=builder /app .
