#!/usr/bin/env sh

set -e

ts-node --transpile-only src/skuba build "${@}"

printf '\n' >> lib/index.d.ts
cat src/loaders.d.ts >> lib/index.d.ts

chmod +x 'lib/skuba.js'
