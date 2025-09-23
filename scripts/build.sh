#!/usr/bin/env sh

set -e

pnpm --filter @skuba-lib/api build

tsx src/skuba build "${@}"

chmod +x 'lib/skuba.js'

pnpm --filter eslint-plugin-skuba build
