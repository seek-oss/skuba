#!/usr/bin/env sh

set -e

tsx --conditions @seek/skuba/source src/skuba build "${@}"

chmod +x 'lib/skuba.js'

pnpm --parallel \
  --filter @skuba-lib/api \
  --filter eslint-config-skuba \
  --filter eslint-plugin-skuba \
  build
