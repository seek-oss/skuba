#!/usr/bin/env bash

set -euxo pipefail

jq -r '.version = "'$(cat .changeset-version)'" + (.version | sub("0.0.0"; ""))' package.json > package.json.tmp
mv package.json.tmp package.json
rm .changeset-version
pnpm build