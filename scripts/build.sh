#!/usr/bin/env sh

set -e

tsx src/skuba build "${@}"

chmod +x 'lib/skuba.js'

pnpm --filter eslint-plugin-skuba build

pnpm --filter @skuba-lib/api build
