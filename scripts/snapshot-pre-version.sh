#!/usr/bin/env bash

set -euo pipefail

pnpm changeset version
jq -r '.version' package.json > .changeset-version
git checkout .