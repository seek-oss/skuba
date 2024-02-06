#!/usr/bin/env sh

set -eux

pnpm changeset version
jq -r '.version' package.json > .changeset-version
git checkout .