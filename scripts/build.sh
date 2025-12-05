#!/usr/bin/env sh

set -e

tsx --conditions @seek/skuba/source src/skuba build "${@}"

chmod +x 'lib/skuba.js'

pnpm --filter @skuba-lib/api build

pnpm --filter @skuba-lib/vitest-koa-mocks build

pnpm --filter eslint-plugin-skuba build
