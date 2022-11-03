#!/usr/bin/env sh

set -e

ts-node --transpile-only src/skuba build-package "${@}"

chmod +x 'lib/skuba.cjs'
chmod +x 'lib/skuba.mjs'
