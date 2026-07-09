#!/usr/bin/env sh

set -e

SKUBA_LOCAL_BUILD=true tsx --conditions @seek/skuba/source src/skuba build-package "${@}"

chmod +x 'lib/skuba.mjs'

pnpm --parallel \
  --filter @skuba-lib/api \
  --filter eslint-config-skuba \
  --filter eslint-plugin-skuba \
  --filter changesets-changelog \
  build
