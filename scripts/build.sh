#!/usr/bin/env sh

set -e

tsx src/skuba build "${@}"

chmod +x 'lib/skuba.js'
