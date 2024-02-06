#!/usr/bin/env sh

set -euxo pipefail

pnpm changeset version
jq -r '.version' package.json > .changeset-version
git checkout .