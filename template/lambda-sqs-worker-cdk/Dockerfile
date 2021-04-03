FROM node:14-alpine3.11 as builder
ARG NPM_TOKEN
WORKDIR /app
COPY ./ /app
RUN echo '//registry.npmjs.org/:_authToken=${NPM_TOKEN}' > .npmrc
RUN yarn install --frozen-lockfile --non-interactive
RUN rm -f .npmrc

FROM node:14-alpine3.11
WORKDIR /app
COPY --from=builder /app .
