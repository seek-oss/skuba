#!/usr/bin/env bash

set -e

echo '=> Packaging...'

pnpm exec ts-node --transpile-only scripts/package.ts

cd dist-docs

git init --initial-branch=main

git add --all

git \
-c 'user.email=<>' \
-c 'user.name=skuba' \
commit \
--author 'skuba <>' \
--message 'Deploy to GitHub Pages' \
--quiet

echo '=> Deploying...'

{
  GIT_URL="git@github.com:seek-oss/skuba.git"

  if [ "${IS_GITHUB_PAGES:-}" = 'true' ]; then
    GIT_URL="https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/seek-oss/skuba.git"
  fi

  git push --force --quiet "${GIT_URL}" 'main:gh-pages'
}

cd ..
rm -rf dist-docs

echo "=> Deployed: https://seek-oss.github.io/skuba"
