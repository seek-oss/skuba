#!/usr/bin/env sh

set -e

tsdown

pnpm --filter @skuba-lib/api build

pnpm --filter @skuba-lib/vitest-koa-mocks build

pnpm --filter eslint-config-skuba build

pnpm --filter eslint-plugin-skuba build

pnpm --filter skuba-dive build
