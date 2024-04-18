#!/usr/bin/env sh

set -e

ts-node --transpile-only src/skuba build "${@}"

chmod +x 'lib/skuba.js'
